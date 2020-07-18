class User {
  login = undefined;
  id = undefined;
  connected = false;
  nowRoom = undefined;

  constructor(login) {
    this.login = login;
  }

}

module.exports = User;