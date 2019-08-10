class App extends React.Component {
  render() {
    return (
      <React.Fragment>
        <Navbar />
        <StatusList />
        <Actions />
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
        </div>
      </nav>
    )
  }
}

class StatusList extends React.Component {
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
                  <span className="text-success">Online</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>Minecraft server</span>
                  <span className="text-success">Online</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>World map</span>
                  <span className="text-success">Online</span>
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
    awsKey: window.localStorage["aws-key"] || "",
    actionResultMessage: "",
    wasActionSuccessful: false,
    isActionInProgress: false
  }

  handleAwsKeyChange = event => {
    this.setState({ awsKey: event.target.value })
  }

  startInstance = event => {
    event.preventDefault()
    this.setState({ isActionInProgress: true })

    window.localStorage["aws-key"] = this.state.awsKey
    const [id, secret] = this.state.awsKey.split(":")
    const ec2 = new AWS.EC2({
      region: "eu-central-1",
      apiVersion: '2014-10-01',
      credentials: { accessKeyId: id, secretAccessKey: secret, region: "eu-central-1" }
    })
    ec2.startInstances({ InstanceIds: ["i-0c6cff9ad722e8bfe"]}, (err, data) => {
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
              <div className="card-header">Actions</div>
              <div className="card-body">
                <div className="form-group">
                  <input
                    type="password"
                    className="form-control bg-secondary text-white"
                    placeholder="AWS Key"
                    autoComplete="off"
                    value={this.state.awsKey}
                    onChange={this.handleAwsKeyChange}
                  />
                </div>
                <button
                  type="button"
                  className="card-link btn btn-secondary"
                  disabled={(/.+:.+/.test(this.state.awsKey) && !this.state.isActionInProgress) ? undefined : "disabled"}
                >Render map</button>
                <button
                  type="button"
                  className="card-link btn btn-outline-warning"
                  disabled={(/.+:.+/.test(this.state.awsKey) && !this.state.isActionInProgress) ? undefined : "disabled"}
                  onClick={this.startInstance}
                >Stop the machine</button>
                {this.state.isActionInProgress && <div className="mt-3 text-muted">Wait...</div>}
                {
                  this.state.actionResultMessage && !this.state.isActionInProgress &&
                  <div className={`mt-3 ${this.state.wasActionSuccessful ? "text-success" : "text-danger"}`}>{this.state.actionResultMessage}</div>
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
