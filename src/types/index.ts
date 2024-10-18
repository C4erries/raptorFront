export type Message = {
    event: string;
    data: any;
}
export type Offer = {
    senderId: string;
    receiverId: string;
    roomId: string;
    offer: RTCSessionDescriptionInit
}
export type Answer = {
    senderId: string;
    receiverId: string;
    roomId: string;
    answer: RTCSessionDescriptionInit;
}
export type Candidate = {
    senderId: string;
    receiverId: string;
    roomId: string;
    candidate: RTCIceCandidate
}
export type Join = {
    userId: string;
    roomId: string;
}
export type GetUsers = {
    roomId: string;
    usersIds: Array<string>
}
export type SendRooms = {
    roomsIds: Array<string>
}
export type CreateRoom ={
    roomId: string;
}
export interface Tracks{
    id: string,
    tracks: Array<MediaStreamTrack>
}