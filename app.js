class App extends React.Component {
  state = {
    shouldAskForAwsKey: !window.localStorage["aws-key"],
    awsKey: window.localStorage["aws-key"] || "",
    isUpdatingStatus: true,
    machineStatus: "secondary"
  }

  getApi = () => {
    const [id, secret] = this.state.awsKey.split(":")

    const awsApi = new AWS.EC2({
      region: "eu-central-1",
      apiVersion: "2016-11-15",
      credentials: { accessKeyId: id, secretAccessKey: secret, region: "eu-central-1" }
    })

    return {
      getInstanceStatus: () =>
        new Promise((resolve, reject) => {
          awsApi.describeInstanceStatus({ InstanceIds: ["i-062dbff0aacf41af1"], IncludeAllInstances: true }, (err, data) => {
            if (err) reject(err)
            else resolve(data.InstanceStatuses[0].InstanceState.Name)
          })
        }),

      getMinecraftStatus: () =>
        fetch("https://minecraft.deltaidea.com:5000/minecraft-status", { cache: "no-store" }).then(r => r.json()),

      getMapStatus: () =>
        fetch("https://minecraft.deltaidea.com:5000/map-status", { cache: "no-store" }).then(r => r.json()),

      startInstance: () =>
        new Promise((resolve, reject) => {
          awsApi.startInstances({ InstanceIds: ["i-062dbff0aacf41af1"]}, (err, data) => {
            if (err) reject(err)
            else resolve(data)
          })
        }),

      stopInstance: () =>
        fetch("https://minecraft.deltaidea.com:5000/system-shutdown", {
          method: "POST",
          cache: "no-store",
          body: `key=${this.state.awsKey}`
        }).then(r => r.json()),
    }
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

  setUpdating = isUpdatingStatus => {
    this.setState({ isUpdatingStatus })
  }

  setMachineStatus = machineStatus => {
    this.setState({ machineStatus })
  }

  componentDidUpdate() {
    $('[data-toggle="tooltip"]').tooltip()
    $('[data-toggle="popover"]').popover()
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
                <StatusList api={this.getApi()} setUpdating={this.setUpdating} setMachineStatus={this.setMachineStatus} />
                <Actions api={this.getApi()} isUpdatingStatus={this.state.isUpdatingStatus} machineStatus={this.state.machineStatus} />
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

  updateUpstreamUpdateFlag = () => {
    if (
      !this.state.isMachineUpdateInProgress &&
      !this.state.isMinecraftUpdateInProgress &&
      !this.state.isMapUpdateInProgress
    ) {
      this.props.setUpdating(false)
    } else {
      this.props.setUpdating(true)
    }
  }

  updateMachineStatus = async () => {
    this.setState({
      isMachineUpdateInProgress: true,
      machineStatus: "secondary",
      machineMessage: "Updating...",
      isMinecraftUpdateInProgress: true,
      minecraftStatus: "secondary",
      minecraftMessage: "Updating...",
      isMapUpdateInProgress: true,
      mapStatus: "secondary",
      mapMessage: "Updating..."
    }, this.updateUpstreamUpdateFlag)

    let rawStatus, err
    try {
      rawStatus = await this.props.api.getInstanceStatus()
    } catch (_err) {
      err = _err
    }

    let status, message

    if (rawStatus === "running") {
      status = "success"
      message = "Online"
    } else if (rawStatus === "pending") {
      status = "warning"
      message = "Starting up"
    } else if (rawStatus === "shutting-down" || rawStatus === "stopping") {
      status = "warning"
      message = "Shutting down"
    } else {
      status = "danger"
      message = "Offline"
    }

    this.setState({
      isMachineUpdateInProgress: false,
      machineStatus: status,
      machineMessage: (err && err.message) || message
    })
    this.props.setMachineStatus(status)

    if (status !== "success") throw new Error()
  }

  updateMinecraftStatus = async () => {
    try {
      const data = await this.props.api.getMinecraftStatus()
      this.setState({
        isMinecraftUpdateInProgress: false,
        minecraftStatus: data.players.online > 0 ? "success" : "warning",
        minecraftMessage: data.players.online > 0 ? "Online" : "Empty"
      }, this.updateUpstreamUpdateFlag)
    } catch (err) {
      console.error(err)
      this.setState({
        isMinecraftUpdateInProgress: false,
        minecraftStatus: "danger",
        minecraftMessage: err.message
      }, this.updateUpstreamUpdateFlag)
    }
  }

  updateMapStatus = async () => {
    try {
      const data = await this.props.api.getMapStatus()
      this.setState({
        isMapUpdateInProgress: false,
        mapStatus: data.status === 200 ? "success" : "danger",
        mapMessage: data.status === 200 ? "Online" : r.statusText
      }, this.updateUpstreamUpdateFlag)
    } catch (err) {
      console.error(err)
      this.setState({
        isMapUpdateInProgress: false,
        mapStatus: "danger",
        mapMessage: err.message
      }, this.updateUpstreamUpdateFlag)
    }
  }

  updateAll = () => {
    this.updateMachineStatus()
      .catch(() => {
        this.setState({
          isMinecraftUpdateInProgress: false,
          minecraftStatus: "danger",
          minecraftMessage: "Offline",
          isMapUpdateInProgress: false,
          mapStatus: "danger",
          mapMessage: "Offline"
        }, this.updateUpstreamUpdateFlag)

        return true
      })
      .then((wasErrorHandled) => {
        if (!wasErrorHandled) {
          this.updateMinecraftStatus()
          this.updateMapStatus()
        }
      })
  }

  componentDidMount() {
    this.updateAll()
    const updateTimerId = setInterval(this.updateAll, 60000)
    this.setState({ updateTimerId })
  }

  componentWillUnmount() {
    clearInterval(this.state.updateTimerId)
  }

  getCardBorderColor = () => {
    const s1 = this.state.machineStatus
    const s2 = this.state.minecraftStatus
    const s3 = this.state.mapStatus

    let color = "secondary"
    if (s1 === "success" && s2 === "success" && s3 === "success") color = "success"
    if (s1 === "warning" || s2 === "warning" || s3 === "warning") color = "warning"
    if (s1 === "danger" || s2 === "danger" || s3 === "danger") color = "danger"

    return color
  }

  getCardHeader = () => {
    if (this.state.minecraftStatus === "success") return "Minecraft running"
    if (this.state.machineStatus === "danger") return "Machine down"
    if (this.state.minecraftStatus === "warning") return "No one's playing"
    return "Systems health"
  }

  render() {
    return (
      <div className="container">
        <div className="row justify-content-center my-4 my-md-5">
          <div className="col-md-8">
            <div className={`card border-${this.getCardBorderColor()}`}>
              <h4 className="card-header">{this.getCardHeader()}</h4>
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

  startInstance = async event => {
    this.setState({ isActionInProgress: true })

    try {
      await this.props.api.startInstance()
      this.setState({
        isActionInProgress: false,
        wasActionSuccessful: true,
        actionResultMessage: "The server is starting up. You may have to wait 30-60 seconds."
      })
    } catch (e) {
      this.setState({
        isActionInProgress: false,
        wasActionSuccessful: false,
        actionResultMessage: err && err.message
      })
    }
  }

  stopInstance = async event => {
    this.setState({ isActionInProgress: true })

    try {
      const result = await this.props.api.stopInstance()
      this.setState({
        isActionInProgress: false,
        wasActionSuccessful: result.result == "success",
        actionResultMessage: result.message
      })
    } catch (err) {
      this.setState({
        isActionInProgress: false,
        wasActionSuccessful: false,
        actionResultMessage: err && err.message
      })
    }
  }

  render() {
    return (
      <div className="container">
        <div className="row justify-content-center my-4 my-md-5">
          <div className="col-md-8">
            <div className="card text-white bg-dark mb-3">
              <h4 className="card-header">Actions</h4>
              <div className="card-body">
                {
                  this.props.machineStatus === "danger" &&
                  <button
                    type="button"
                    className="card-link btn btn-primary"
                    disabled={!this.state.isActionInProgress && !this.props.isUpdatingStatus ? undefined : "disabled"}
                    onClick={this.startInstance}
                  >Start the machine</button>
                }
                {
                  this.props.machineStatus === "success" &&
                  <React.Fragment>
                    <div className="mb-3">
                      The server will stay online indefinitely. Write <code>--system-shutdown</code> in the game
                      chat or press the button below to stop the instance.
                    </div>
                    <button
                      type="button"
                      className="card-link btn btn-primary"
                      disabled={!this.state.isActionInProgress && !this.props.isUpdatingStatus ? undefined : "disabled"}
                      onClick={this.stopInstance}
                    >Stop the machine</button>
                  </React.Fragment>
                }
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
