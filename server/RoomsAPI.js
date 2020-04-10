
exports.RoomsApi = class RoomsApi {
  constructor() {
    this.callbacks = {
      CreateRoom: this.createRoom,
      JoinRoom: this.joinRoom,
      GetUserRooms: this.getUserRooms,
      Message: this.message,
      RoomUserStatus: this.roomUserStatus,
      GetChatHistory: this.getChatHistory,
      ResetPasscode: this.resetPasscode
    };
  }

  async createRoom(socket, data) {
    var result = await global.$DATA.rooms.createRoom(data);
    if (!result.success) return;
    if (result.room.history)
      await global.$DATA.history.createRoom(result.room.ID);
    global.$LOG.entry('Rooms', `${data.owner} created room "${data.name}"`);
    socket.emit('CreateRoom', result);
  }
  async joinRoom(socket, data) {
    var result = await global.$DATA.rooms.joinRoom(data.roomName, data.username, data.passcode);
    socket.emit('JoinRoom', result);
    if (!result.success) return;
    global.$LOG.entry('Rooms', `${data.username} joined #${result.room.ID}`);
    delete result.success;
    global.$DATA.accounts.broadcast(result.room.users, 'NewRoomMember', result);
  }
  async getUserRooms(socket, data) {
    var result = await global.$DATA.rooms.getUserRooms(data.username);
    global.$LOG.entry('Rooms', `${data.username} gets their rooms list (${result.rooms.length})`);
    socket.emit('GetUserRooms', result);
  }
  async message(socket, data) {
    data.timestamp = Date.now();
    var room = await global.$DATA.rooms.getRoom(data.roomID);
    if (room.history)
      await global.$DATA.history.addMessage(data);
    global.$DATA.accounts.broadcast(room.users, 'Message', data);
  }
  async roomUserStatus(socket, data) {
    var user = await global.$DATA.accounts.getUser(data.username);
    if (socket.id != user.sessionID)
      return {success:false, reason:'Invalid session'};
    var status = {'offline':0, 'away':1, 'active':2}[data.status];
    var room = await global.$DATA.rooms.getRoom(data.roomID);
    await global.$APIS.status.setStatus(data.username, room, status);
  }
  async getChatHistory(socket, data) {
    global.$LOG.entry('Rooms', `Sending history of #${data.roomID} to ${data.username}`);
    var result = await global.$DATA.history.getChatHistory(data.roomID);
    socket.emit('ChatHistory', result);
  }
  async resetPasscode(socket, data) {
    global.$LOG.entry('Rooms', `Resettings passcode of #${data.roomID}`);
    var result = await global.$DATA.rooms.resetPasscode(data.roomID);
    result.silent = false;
    socket.emit('ResetPasscode', result);
    if (result.success) {
      result.silent = true;
      global.$DATA.accounts.broadcast(room.users, 'ResetPasscode', result);
    }
  }
}
