class App extends React.Component {
  state = {
    shouldAskForAwsKey: !window.localStorage["aws-key"],
    awsKey: window.localStorage["aws-key"] || "",
    updateTimerId: null
  }

  getApi = () => {
    const [id, secret] = this.state.awsKey.split(":")

    return new AWS.EC2({
      region: "eu-central-1",
      apiVersion: "2016-11-15",
      credentials: { accessKeyId: id, secretAccessKey: secret, region: "eu-central-1" }
    })
  }

  askForAwsKey = () => {
    this.setState({ shouldAskForAwsKey: true })
  }

  changeAwsKey = awsKey => {
    window.localStorage["aws-key"] = awsKey
    this.setState({ shouldAskForAwsKey: false, awsKey })
  }

  cancelAwsKeyChange = () => {
    this.setState({ shouldAskForAwsKey: false })
  }

  render() {
    return (
      <React.Fragment>
        <Navbar canAskForAwsKey={!this.state.shouldAskForAwsKey} askForAwsKey={this.askForAwsKey} />
        {
          this.state.shouldAskForAwsKey
            ? <KeyForm
                onChange={this.changeAwsKey}
                canCancel={!!this.state.awsKey}
                onCancel={this.cancelAwsKeyChange}
              />
            : <React.Fragment>
                <StatusList api={this.getApi()} />
                <Actions api={this.getApi()} />
              </React.Fragment>
        }
      </React.Fragment>
    )
  }
}

class Navbar extends React.Component {
  render() {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <a className="navbar-brand" href="#">
          <img src="./grass.jpg" width="30" height="30" className="d-inline-block align-top" alt="" />
          {" "}DQ Server
        </a>

        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarMain">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarMain">
          <ul className="navbar-nav mr-auto">
            <li className="nav-item">
              <a className="nav-link" href="http://minecraft.deltaidea.com">World map</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="https://trello.com/b/VI1FemyT">Trello</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="https://github.com/dq-server">GitHub</a>
            </li>
          </ul>
          {
            this.props.canAskForAwsKey &&
            <button className="btn btn-link" onClick={this.props.askForAwsKey}>Change AWS Key</button>
          }
        </div>
      </nav>
    )
  }
}

class KeyForm extends React.Component {
  state = {
    value: "",
    showValidationError: false,
  }

  handleChange = event => {
    this.setState({ value: event.target.value, showValidationError: false })
  }

  handleSubmit = event => {
    event.preventDefault()

    if (/.+:.+/.test(this.state.value)) {
      this.props.onChange(this.state.value)
    } else {
      this.setState({ showValidationError: true })
    }
  }

  render() {
    return (
      <div className="container">
        <div className="row justify-content-center my-4 my-md-5">
          <div className="col-md-8">
            <form onSubmit={this.handleSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-control bg-secondary text-white"
                  placeholder="AWS Key"
                  autoComplete="off"
                  value={this.value}
                  onChange={this.handleChange}
                />
              </div>
            </form>
            {
              this.props.canCancel &&
              <div className="form-group">
                <button className="btn btn-secondary" onClick={this.props.onCancel}>Cancel</button>
              </div>
            }
            { this.state.showValidationError && <div className="text-danger mt-2">Invalid key</div> }
          </div>
        </div>
      </div>
    )
  }
}

class StatusList extends React.Component {
  state = {
    updateTimerId: null,
    isMachineUpdateInProgress: true,
    machineStatus: "secondary",
    machineMessage: "Updating...",
    isMinecraftUpdateInProgress: true,
    minecraftStatus: "secondary",
    minecraftMessage: "Updating...",
    isMapUpdateInProgress: true,
    mapStatus: "secondary",
    mapMessage: "Updating..."
  }

  updateMachineStatus = () => {
    this.setState({
      isMachineUpdateInProgress: true,
      machineStatus: "secondary",
      machineMessage: "Updating..."
    })

    this.props.api.describeInstanceStatus({ InstanceIds: ["i-0c6cff9ad722e8bfe"]}, (err, data) => {
      console.log(err || data)

      const rawState = !err && data.InstanceStatuses[0].InstanceState.Name

      let status, message

      if (rawState === "running") {
        status = "success"
        message = "Online"
      } else if (rawState === "pending") {
        status = "warning"
        message = "Starting up"
      } else {
        status = "danger"
        message = rawState.replace("-", " ")
      }

      this.setState({
        isMachineUpdateInProgress: false,
        machineStatus: status,
        machineMessage: (err && err.message) || message
      })
    })
  }

  updateMinecraftStatus = () => {
    this.setState({
      isMinecraftUpdateInProgress: true,
      minecraftStatus: "secondary",
      minecraftMessage: "Updating..."
    })

    fetch('http://minecraft.deltaidea.com:5000/minecraft-status').then(r => r.json()).then(data => {
      console.log(data)
      this.setState({
        isMinecraftUpdateInProgress: false,
        minecraftStatus: "success",
        minecraftMessage: "Online"
      })
    }).catch(err => {
      console.error(err)
      this.setState({
        isMinecraftUpdateInProgress: false,
        minecraftStatus: "danger",
        minecraftMessage: err.message
      })
    })
  }

  updateMapStatus = () => {
    this.setState({
      isMapUpdateInProgress: true,
      mapStatus: "secondary",
      mapMessage: "Updating..."
    })

    fetch('http://minecraft.deltaidea.com:5000/map-status').then(r => r.json()).then(data => {
      console.log("Map status:", data)
      this.setState({
        isMapUpdateInProgress: false,
        mapStatus: data.status === 200 ? "success" : "danger",
        mapMessage: data.status === 200 ? "Online" : r.statusText
      })
    }).catch(err => {
      console.error(err)
      this.setState({
        isMapUpdateInProgress: false,
        mapStatus: "danger",
        mapMessage: err.message
      })
    })
  }

  updateAll = () => {
    this.updateMachineStatus()
    this.updateMinecraftStatus()
    this.updateMapStatus()
  }

  componentDidMount() {
    this.updateAll()
    const updateTimerId = setInterval(this.updateAll, 60000)
    this.setState({ updateTimerId })
  }

  componentWillUnmount() {
    clearInterval(this.state.updateTimerId)
  }

  render() {
    return (
      <div className="container">
        <div className="row justify-content-center my-4 my-md-5">
          <div className="col-md-8">
            <div className="card border-success">
              <h4 className="card-header">Minecraft running</h4>
              <div className="card-body">
                <p className="card-text">Everything seems to be operational.</p>
                <p className="card-text">Keep in mind that the server will automatically shut down after 15&nbsp;minutes of inactivity.</p>
              </div>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>Underlying machine</span>
                  <span className={`text-${this.state.machineStatus} text-capitalize`}>{this.state.machineMessage}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>Minecraft server</span>
                  <span className={`text-${this.state.minecraftStatus} text-capitalize`}>{this.state.minecraftMessage}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>World map</span>
                  <span className={`text-${this.state.mapStatus} text-capitalize`}>{this.state.mapMessage}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

class Actions extends React.Component {
  state = {
    actionResultMessage: "",
    wasActionSuccessful: false,
    isActionInProgress: false
  }

  startInstance = event => {
    this.setState({ isActionInProgress: true })

    this.props.api.startInstances({ InstanceIds: ["i-0c6cff9ad722e8bfe"]}, (err, data) => {
      console.log(err || data)
      this.setState({
        isActionInProgress: false,
        actionResultMessage: err.message || "The server is starting up. You may have to wait 30-60 seconds.",
        wasActionSuccessful: !err
      })
    })
  }

  render() {
    return (
      <div className="container">
        <div className="row justify-content-center my-4 my-md-5">
          <div className="col-md-8">
            <div className="card text-white bg-dark mb-3">
              <h4 className="card-header">Actions</h4>
              <div className="card-body">
                <button
                  type="button"
                  className="card-link btn btn-secondary"
                  disabled={!this.state.isActionInProgress ? undefined : "disabled"}
                >Render map</button>
                <button
                  type="button"
                  className="card-link btn btn-outline-warning"
                  disabled={!this.state.isActionInProgress ? undefined : "disabled"}
                  onClick={this.startInstance}
                >Stop the machine</button>
                {this.state.isActionInProgress && <div className="mt-3 text-muted">Wait...</div>}
                {
                  this.state.actionResultMessage && !this.state.isActionInProgress &&
                  <div className={`mt-3 ${this.state.wasActionSuccessful ? "text-success" : "text-danger"}`}>
                    {this.state.actionResultMessage}
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

ReactDOM.render(<App />, document.querySelector('#root'))
