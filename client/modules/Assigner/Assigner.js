import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Card, CardHeader, CardActions, CardText } from 'material-ui/Card';
import RaisedButton from 'material-ui/RaisedButton';
import Chip from 'material-ui/Chip';
import QueueList from './components/QueueList';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import { Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle } from 'material-ui/Toolbar';
import { fetchAccounts, toggleAccount, pollingAccountsRequest } from './../Account/AccountActions';
import { getAccounts } from '../../modules/Account/AccountReducer';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';

// Import Style
import styles from './Assigner.css';

// Import Actions
import { fetchProjects, toggleProject, selectProject, postSubmissions, fetchSubmission, fetchPositions, fetchAssignmentCount, setError, cancelSubmission, notifyAssignedProject, refreshSubmission, updateSubmission, clearPositions } from './AssignerActions';

// Import Selectors
import { getProjects, getPositions, getSelectedProjects, getSubmission, getError, getAssignCount } from './AssignerReducer';

class Assigner extends Component {


  constructor(props) {
    super(props);
    this.state = {
      value: null
    };
    this.styles = {
      chip: {
        margin: 4,
      },
      selectedchip: {
        margin: 4,
        backgroundColor: '#03A9F4',
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap',
        margin: 12,
      },
      startButton: {
        margin: 12
      }
    };
    //console.log(pollingPref);
    //console.log(JSON.parse(pollingPref).pollingStarted);
    this.pollingStarted = false;
    this.queuingStarted = false;
    this.restartingTimer = false;
    this.time = false;
    this.timer = false;
  }

  componentDidMount() {
    this.props.dispatch(fetchAccounts());
  }

  startCheckingAssignmentCount = () => {
    if (!this.pollingStarted) {
      return;
    }
    console.log('Fetching assign count');
    this.props.dispatch(fetchAssignmentCount(this.state.value));
    setTimeout(() => this.startCheckingAssignmentCount(), 60000);
  }

  startSubmissionPolling = () => {
    if (!this.pollingStarted) {
      return;
    }
    console.log('Fetching Submissions');
    this.props.dispatch(fetchSubmission(this.state.value));
    this.timer = setTimeout(() => this.startSubmissionPolling(), 60000);
  }

  startPollingPositions = (submissionId) => {
    if (!this.queuingStarted) {
      return;
    }
    console.log("Starting to poll!");
    console.log(submissionId);
    this.props.dispatch(fetchPositions(this.state.value, submissionId));
    this.time = setTimeout(() => this.startPollingPositions(submissionId), 120000);
  }

  startRefreshSubmission = (submission) => {
    console.log("Starting Refresh!");
    if (submission.status != 'fulfilled') {
      this.props.dispatch(refreshSubmission(this.state.value, submission.id));
    }
  }


  componentWillReceiveProps(nextProps) {

    // Fetch positions if we have a current submission
    if ((!this.queuingStarted || this.restartingTimer) && nextProps.currentSubmission && nextProps.currentSubmission.length > 0) {
      this.queuingStarted = true;
      this.restartingTimer = false;
      // Start checking for assignment count
      this.startCheckingAssignmentCount();

      let accountDetail = (this.props.accounts.filter(account => account.cuid === this.state.value)[0]);
      var projectsToSelect = accountDetail.selectedProjects;
      projectsToSelect.forEach(function (value) {
        this.props.dispatch(selectProject(value.project_id));
      }, this);

      // Start position polling
      nextProps.currentSubmission.map(value => {
        this.startPollingPositions(value.id);
      }, this);

      // Start submission polling
      this.startSubmissionPolling();
    }

    if (!this.pollingStarted) {
      // noop
      return;
    }

    if (nextProps.assignCount >= 2) {
      // Account is full, need to wait, so start a assignment count check thread every 2 minutes
      if (this.props.assignCount != nextProps.assignCount) {
        this.props.dispatch(setError("Account is full now! Waiting for submissions to be less than 2."));
      }
    }


    if (this.queuingStarted && nextProps.assignCount < 2 && (!nextProps.currentSubmission || nextProps.currentSubmission.length == 0)) {
      if (this.props.selectedProjects.length > 0) {
        // The assign count has gone below 2, and there are no submissions, start a new submisison.
        this.handlePostSubmissions(this.props.selectedProjects);
      }
    }

    if (this.queuingStarted && nextProps.currentSubmission && nextProps.currentSubmission.length > 0) {
      // Check to see the refresh timeout has elapsed or not
      let endsAt = new Date(nextProps.currentSubmission[0].closed_at);
      let timeout = endsAt.getTime() - Date.now();
      console.log('Checking Timeout');

      if (timeout < 300000) {   // minus 5 minutes
        // Needs refresh
        nextProps.currentSubmission.map(value => {
          this.startRefreshSubmission(value);
        }, this);
      }
    }
  }

  handleToggleProject = (projectId) => {
    // Disable project selection/deselection if we have a current submission already
    if (!this.props.currentSubmission || this.props.currentSubmission.length == 0) {
      this.props.dispatch(toggleProject(projectId));
    }
  }

  handlePostSubmissions = (selectedProjects) => {
    let accountDetail = (this.props.accounts.filter(account => account.cuid === this.state.value)[0])
    selectedProjects.forEach(function (project) {
      var selectedProject = { project_id: project.project_id, language: "en-us" };
      accountDetail.selectedProjects.push(selectedProject);
    }, this);
    this.pollingStarted = true
    if (accountDetail != null)
      this.props.dispatch(pollingAccountsRequest({ pollingStarted: true, queuingStarted: true, selectedProjects: accountDetail.selectedProjects, cuid: accountDetail.cuid }));

    this.startCheckingAssignmentCount();
    if (this.props.assignCount < 2) {
      // Start a submission only when assign count < 2
      this.props.dispatch(postSubmissions({
        cuid: this.state.value,
        projects: selectedProjects.map(value => {
          return { project_id: value.project_id, language: 'en-us' };
        })
      }));
    }
  }

  handleCancelSubmission = (submission) => {
    let accountDetail = (this.props.accounts.filter(account => account.cuid === this.state.value)[0])
    accountDetail.selectedProjects.length = 0;

    if (accountDetail != null)
      this.props.dispatch(pollingAccountsRequest({ pollingStarted: false, queuingStarted: false, selectedProjects: accountDetail.selectedProjects, cuid: accountDetail.cuid }));

    this.queuingStarted = false;
    this.pollingStarted = false;
    submission.map(value => {
      this.props.dispatch(cancelSubmission(this.state.value, value.id));
    }, this);
  }

  handleProjectAssigned = (projectId) => {
    // send email to user with the project projectId
    this.props.dispatch(notifyAssignedProject(projectId, this.state.value));
  }

  handleGetProjects = () => {
    if (this.time) {
      clearTimeout(this.time);
      this.time = false;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = false;
    }
    this.props.dispatch(fetchAssignmentCount(this.state.value));
    this.props.dispatch(fetchProjects(this.state.value));
    this.props.dispatch(fetchSubmission(this.state.value));
    this.props.dispatch(clearPositions());
    let accountDetail = (this.props.accounts.filter(account => account.cuid === this.state.value)[0]);
    this.pollingStarted = accountDetail.pollingStarted;
    this.queuingStarted = accountDetail.queuingStarted;
    var projectsToSelect = accountDetail.selectedProjects;
      projectsToSelect.forEach(function (value) {
        this.props.dispatch(selectProject(value.project_id));
      }, this);

    if (this.queuingStarted) {
      this.restartingTimer = true;
    }
  }

  renderChip(data) {
    return (
      <Chip
        key={data.project_id}
        style={data.selected ? this.styles.selectedchip : this.styles.chip}
        labelColor={data.selected ? '#FFFFFF' : '#000000'}
        onTouchTap={() => this.handleToggleProject(data.project_id)}
      >
        {data.project_id}
      </Chip>
    );
  }

  renderAccount(account) {
    return (
      <MenuItem key={account.cuid} value={account.cuid} primaryText={account.email} />
    );
  }

  handleClose = () => {
    this.props.dispatch(setError(""));
  };

  handleChange = (event, index, value) => this.setState({ value });


  render() {
    const actions = [
      <FlatButton
        label="OK"
        primary={true}
        onTouchTap={this.handleClose}
      />,
    ];
    return (
      <div>
        <Card expanded={true}>
          <CardHeader
            title="Accounts"
            subtitle="Select the account to queue"
            actAsExpander={true}
            showExpandableButton={true}
          />

          <div style={this.styles.wrapper}>
            <SelectField
              floatingLabelText="Accounts"
              value={this.state.value}
              onChange={this.handleChange}
              disabled={this.props.accounts.length == 0}
            >
              {this.props.accounts.map(this.renderAccount, this)}
            </SelectField>
          </div>

          <CardActions>
            <RaisedButton primary={true} label="Fetch Projects"
              onClick={() => this.handleGetProjects()}
              disabled={this.state.value == null} style={this.styles.startButton} />
          </CardActions>
        </Card>
        <Card expanded={true}>
          <CardHeader
            title="Projects"
            subtitle="Select the projects to queue"
            actAsExpander={true}
            showExpandableButton={true}
          />

          <div style={this.styles.wrapper} >
            {this.props.projects.map(this.renderChip, this)}
          </div>

          <CardActions>
            <RaisedButton primary={true} label="Start"
              onClick={() => this.handlePostSubmissions(this.props.selectedProjects)}
              disabled={this.props.selectedProjects.length == 0 || this.props.currentSubmission.length > 0 || this.pollingStarted} style={this.styles.startButton} />
            <RaisedButton primary={true} label="Cancel"
              onClick={() => this.handleCancelSubmission(this.props.currentSubmission)}
              disabled={!this.pollingStarted} style={this.styles.startButton} />
          </CardActions>
        </Card>
        <Toolbar>
          <ToolbarGroup firstChild={true}>
            <ToolbarTitle text={"Queuing Status: " + (this.pollingStarted ? "Started" : "Stopped")} />
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ToolbarTitle text={"Next Refresh: " + (this.props.currentSubmission && this.props.currentSubmission.length > 0 ? this.props.currentSubmission[0].closed_at : "No Submission Yet!")} />
          </ToolbarGroup>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ToolbarTitle text={"Assigned Count: " + this.props.assignCount} />
          </ToolbarGroup>
        </Toolbar>
        <QueueList queues={this.props.positions} handleProjectAssigned={this.handleProjectAssigned} />
        <Dialog
          title="API Error"
          actions={actions}
          modal={true}
          open={this.props.error && this.props.error.length > 0}
          onRequestClose={this.handleClose}
        >
          {this.props.error}
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    projects: getProjects(state),
    positions: getPositions(state),
    selectedProjects: getSelectedProjects(state),
    currentSubmission: getSubmission(state),
    assignCount: getAssignCount(state),
    error: getError(state),
    accounts: getAccounts(state),
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return { ...ownProps, ...stateProps, ...dispatchProps };
}

Assigner.propTypes = {
  projects: PropTypes.array,
  dispatch: PropTypes.func.isRequired,
  positions: PropTypes.array.isRequired,
  currentSubmission: PropTypes.array.isRequired,
  assignCount: PropTypes.number.isRequired,
  error: PropTypes.string,
  accounts: PropTypes.array.isRequired,
};

Assigner.contextTypes = {
  router: React.PropTypes.object,
};

export default connect(
  mapStateToProps,
)(Assigner);
