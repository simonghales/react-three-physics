import React, {createContext, useCallback, useContext, useEffect, useRef} from "react"
import hotkeys from 'hotkeys-js';
import {useOnCustomMessage, useSendCustomMessage} from "./CustomMessages";

enum MESSAGE_KEY {
    KEY_PRESS = '_KEY_PRESS'
}

export const KeysCapture: React.FC = () => {

    const sendMessage = useSendCustomMessage()

    useEffect(() => {
        hotkeys('*', {
            keydown: true,
            keyup: true,
        }, (event) => {
            const {
                keyCode,
                repeat,
                type
            } = event
            sendMessage(MESSAGE_KEY.KEY_PRESS, {
                keyCode,
                repeat,
                type,
            })
        })
    }, [])

    return null
}

const Context = createContext<{
    keysRef: any,
}>(null!)

export const useIsKeyPressed = () => {
    const keysRef = useContext(Context).keysRef
    const isKeyPressed = useCallback((keys: string[]) => {
        let pressed = false
        keys.forEach(key => {
            if (keysRef.current.keys[key]) {
                pressed = true
            }
        })
        return pressed
    }, [])
    return isKeyPressed
}

export const KeysConsumer: React.FC = ({children}) => {

    const keysRef = useRef<{
        keys: Record<string, boolean>,
    }>({
        keys: {},
    })

    useOnCustomMessage(MESSAGE_KEY.KEY_PRESS, (data: {
        keyCode: any,
        repeat: boolean,
        type: string,
    }) => {
        keysRef.current.keys[data.keyCode] = data.type === 'keydown'
    })

    return (
        <Context.Provider value={{
            keysRef,
        }}>
            {children}
        </Context.Provider>
    )
}
