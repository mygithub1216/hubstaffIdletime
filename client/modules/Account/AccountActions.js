import callApi from '../../util/apiCaller';

// Export Constants
export const ADD_ACCOUNT = 'ADD_ACCOUNT';
export const ADD_ACCOUNTS = 'ADD_ACCOUNTS';
export const DELETE_ACCOUNT = 'DELETE_ACCOUNT';
export const TOGGLE_ACCOUNT = 'TOGGLE_ACCOUNT';
export const SET_MESSAGE = 'SET_MESSAGE';

// Export Actions
export function addAccount(account) {
  return {
    type: ADD_ACCOUNT,
    account,
  };
}

export function addAccountRequest(account) {
  return (dispatch) => {
    return callApi('accounts', 'post', {
      account: {
        email: account.email,
        password: account.password,
        threads:account.threads,
      },
    }).then(res => dispatch(addAccount(res.account)));
  };
}

export function addAccounts(accounts) {
  return {
    type: ADD_ACCOUNTS,
    accounts,
  };
}

export function fetchAccounts() {
  return (dispatch) => {
    return callApi('accounts').then(res => {
      dispatch(addAccounts(res.accounts));
    });
  };
}

export function fetchAccount(cuid) {
  return (dispatch) => {
    return callApi(`accounts/${cuid}`).then(res => dispatch(addAccount(res.account)));
  };
}

export function deleteAccount(cuid) {
  return {
    type: DELETE_ACCOUNT,
    cuid,
  };
}

export function deleteAccountRequest(cuid) {
  return (dispatch) => {
    return callApi(`accounts/${cuid}`, 'delete').then(() => dispatch(deleteAccount(cuid)));
  };
}

export function pollingAccountsRequest(account){
  var cuid = account.cuid;
  return (dispatch) => {
    return callApi(`accounts/poll/${cuid}`, 'put', {
      account: {
        pollingStarted: account.pollingStarted,
        selectedProjects: account.selectedProjects,
        queuingStarted:account.queuingStarted,
      },
    });
  };
}

export function associateUsersRequest(account) {
  var cuid = account.cuid;
  return (dispatch) => {
    return callApi(`accounts/update/${cuid}`, 'put', {
      account: {
        users: account.users,
        password: account.password,
        threads: account.threads,
      },
    }).then(res => dispatch(setSuccessMessage("Account details updated")));
  };
}
export function setSuccessMessage(message) {
  return {
    type: SET_MESSAGE,
    message,
  };
}
export function toggleAccount(cuid) {
  return {
    type: TOGGLE_ACCOUNT,
    cuid,
  };
}
