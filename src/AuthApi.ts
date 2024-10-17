import {createContext} from  "react"
import {MutableRefObject} from "react";

export interface AuthApiContextType {
    selfId: MutableRefObject<string>;
    socketRef: MutableRefObject<any>;
}
export const AuthApi= createContext<AuthApiContextType | null>(null);