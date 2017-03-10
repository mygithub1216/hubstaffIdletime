import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Card, CardHeader, CardActions, CardText } from 'material-ui/Card';
import RaisedButton from 'material-ui/RaisedButton';
import Chip from 'material-ui/Chip';
import QueueList from './components/QueueList';

// Import Style
import styles from './Assigner.css';

// Import Actions
import { fetchProjects, toggleProject, postSubmissions, fetchSubmission, fetchPositions } from './AssignerActions';

// Import Selectors
import { getProjects, getPositions, getSelectedProjects, getSubmission } from './AssignerReducer';

class Assigner extends Component {
  
  constructor(props) {
    super(props);
    this.state = {chipData: [
      {key: 0, label: 'Angular'},
      {key: 1, label: 'JQuery'},
      {key: 2, label: 'Polymer'},
      {key: 3, label: 'ReactJS'},
    ]};
    this.styles = {
      chip: {
        margin: 4,
      },
      selectedchip: {
        margin:4,
        backgroundColor:'#03A9F4',
      },
      wrapper: {
        display: 'flex',
        flexWrap: 'wrap',
      },
      startButton: {
        margin: 12
      }
    };
    this.pollingStarted = false;
  }
  
  componentDidMount() {
    this.props.dispatch(fetchProjects());
    this.props.dispatch(fetchSubmission());
  }

  startPollingPositions = (submissionId) => {
    console.log("Starting to poll!");
    console.log(submissionId);
    this.props.dispatch(fetchPositions(submissionId));
    setTimeout(() => this.startPollingPositions(submissionId), 120000);
  }

  componentWillReceiveProps(nextProps) {
    // Fetch positions if we have a current submission
    if (!this.pollingStarted && nextProps.currentSubmission && nextProps.currentSubmission.id) {
      this.startPollingPositions(nextProps.currentSubmission.id);
      this.pollingStarted = true;
    }
  }

  handleToggleProject = (projectId) => {
    this.props.dispatch(toggleProject(projectId))
  }

  handlePostSubmissions = (selectedProjects) => {
    this.props.dispatch(postSubmissions(selectedProjects.map(value => {
      return {project_id: value.project_id, language: value.project.languages_to_recruit[0] || "en-us"};
    })));
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
  
  render() {
    return (
      <div>
        <Card expanded="true">
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
                disabled={this.props.selectedProjects.length == 0 || this.props.currentSubmission}  style={this.styles.startButton} />
          </CardActions>
        </Card>
        <QueueList queues={this.props.positions} />
      </div>
    );
  }
}

Assigner.need = [() => { return fetchProjects(); }];

const mapStateToProps = (state) => {
  return {
    projects: getProjects(state),
    positions: getPositions(state),
    selectedProjects: getSelectedProjects(state),
    currentSubmission: getSubmission(state),
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
   return { ...ownProps, ...stateProps, ...dispatchProps };
}

Assigner.propTypes = {
  projects: PropTypes.array,
  dispatch: PropTypes.func.isRequired,
  positions: PropTypes.array.isRequired,
  currentSubmission: PropTypes.object.isRequired,
};

Assigner.contextTypes = {
  router: React.PropTypes.object,
};

export default connect(
  mapStateToProps,
)(Assigner);