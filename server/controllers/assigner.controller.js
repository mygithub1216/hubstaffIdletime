import Assigner from '../models/assigner';
import request from '../util/request';
import { projectsUrl, submitUrl, listSubmissionsUrl, assignCountUrl } from '../util/udacityHelpers';
import { getAuthToken } from '../util/request';
import sendMail from '../util/mailer';
const async = require("async");
const numCPUs = require('os').cpus().length;
import Account from '../models/account';
import logWriter from '../util/logWriter';


export function getProjects(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
  console.log(req.params.cuid);
  Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      //console.log(token);
      request(projectsUrl, {'Authorization' : token}).then(response => {
        // TODO: handle multiple accounts, currently return projects of first account only.
        console.log('Projects...');
        console.log(response);

        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('getProjects: ',response,hrend);
        //log end 
        
        res.status(200).json({
          success: true,
          projects: response.error || response.FetchError || response.name == 'FetchError'
                        ? [] : response.map((project) =>  {
                          project.cuid = account.cuid;
                          return project;
                      })
        });
      });
    });
  });
}

export function postProjects(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // TODO: check to see if we have an projects.
  // Get the udacity account token
  Account.findOne({ cuid: req.body.cuid }).exec((err, account) => {
      console.log(req.body.cuid);

    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      //console.log(req.body);
      let processes = [];

      // Fork workers.
      // TODO: hardcoded number of threads for now, need to be set by admin per account.
      for (let i = 0; i < account.threads; i++) {
        processes.push(function(callback){
          request(submitUrl, {'Authorization' : token}, 'post' , {projects: req.body.projects}).then(response => {
            //console.log(response);
            if (response.error) {
              // TODO: ignore for now, need to find a way on how to OR errors
              //callback(response.error, null)
            }
            callback(null, response);
          });
        });
      }

      async.parallel(processes, function(err, results){
        // All tasks are done now
        console.log(results);
        let error = null;
        let returnResults = [];
        results.map(value => {
          if (value.error || value.FetchError || value.name == 'FetchError') {
            error = value.error || value.FetchError;
          }
          else {
            value.cuid = account.cuid;
            returnResults.push(value);
          }
        });

        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('postProjects: ',returnResults,hrend);
        //log end

        let hasError = returnResults.length == 0;
        res.status(200).json({
          success: hasError ? false : true,
          submission: returnResults,
          message: hasError ? error : ""
        });
      });
    });
  });
}

export function getPositions(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
  Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      console.log(token);
      request(submitUrl + "/" + req.params.submissionId + "/waits.json", {'Authorization' : token}).then(response => {
        console.log('Positions');
        console.log(response);
        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('getPositions: ',response,hrend);
        //log end
        response.forEach((project) => project.cuid = account.cuid );
        res.status(200).json({
          success: true,
          submissionId: req.params.submissionId,
          positions: response
        });
      });
    });
  });
}

export function getSubmission(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
  Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      console.log(token);
      request(listSubmissionsUrl, {'Authorization' : token}).then(response => {
        // TODO: handle multiple accounts, currently return projects of first account only.
        console.log("Submissions");
        console.log(response);
        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('getSubmission: ',response,hrend);
        //log end
        res.status(200).json({
          success: true,
          submission: response.error || response.FetchError || response.name == 'FetchError'
                        ? [] : response.map(v => {
                          v.cuid = account.cuid;
                          return v;
                        })
        });
      });
    });
  });
}

export function cancel(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
  Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      console.log('Cancelling project...');
      //log start
        var hrend = process.hrtime(hrstart);
        logWriter('cancel: ',response,hrend);
        //log end
      request(submitUrl + "/" + req.params.submissionId + ".json", {'Authorization' : token}, 'delete').then(response => {
        //console.log(response);
        res.status(200).json({
          success: true,
        });
      });
    });
  });
}

export function notify(req, res) {

  // start timer
  var hrstart = process.hrtime();

  Account.findOne({ cuid: req.params.cuid }).populate('users').exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    account.users.forEach(user => {
      // Email the user
      // req.user
      // req.params.projectId
      let mailOptions = {
        to: user.email,
        cc:'adipster.script@gmail.com',
        subject: 'Project Assigned: ' + req.params.projectId, // Subject line
        text: 'Dear ' + user.name + ', \n Project with id ' + req.params.projectId + ' has been assigned to you!', // plain text body
      };
      sendMail(mailOptions, (error, info) => {
          res.status(200).json({
            success: error ? false : true,
          });
      });
    });
  });
}

export function refresh(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
 Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      console.log('Refreshing project...');
      request(submitUrl + "/" + req.params.submissionId + "/refresh.json", {'Authorization' : token}, 'put').then(response => {
        console.log(response);

        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('refresh: ',response,hrend);
        //log end

        res.status(200).json({
          success: response.error ? false : true,
          submission: response.error ? {} : response,
          message: response.error || ""
        });
      });
    });
  });
}

export function getAssignCount(req, res) {

  // start timer
  var hrstart = process.hrtime();

  // Get the udacity account token
  Account.findOne({ cuid: req.params.cuid }).exec((err, account) => {
    if (err || account == null) {
      res.status(500).send(err);
    }

    var credentials = {
      email: account.email,
      password: account.password
    }
    getAuthToken(credentials).then(token => {
      //console.log(token);
      console.log("Assign count----");
      request(assignCountUrl, {'Authorization' : token}).then(response => {
        // TODO: handle multiple accounts, currently return projects of first account only.
        console.log(response);

        //log start
        var hrend = process.hrtime(hrstart);
        logWriter('getAssignCount: ',response,hrend);
        //log end

        res.status(200).json({
          success: true,
          assignCount: response.assigned_count || 0
        });
      });
    });
  });
}