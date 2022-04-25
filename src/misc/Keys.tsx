import React, {createContext, useCallback, useContext, useEffect, useRef} from "react"
import hotkeys from 'hotkeys-js';
import {useOnCustomMessage, useSendCustomMessage} from "./CustomMessages";

enum MESSAGE_KEY {
    KEY_PRESS = '_KEY_PRESS',
    WINDOW_BLUR = '_WINDOW_BLUR'
}

export const KeysCapture: React.FC = () => {

    const sendMessage = useSendCustomMessage()

    useEffect(() => {
        const onBlur = () => {
            sendMessage(MESSAGE_KEY.WINDOW_BLUR, null)
        }
        window.addEventListener('blur', onBlur)
        return () => {
            window.removeEventListener('blur', onBlur)
        }
    }, [])

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

    useOnCustomMessage(MESSAGE_KEY.WINDOW_BLUR, useCallback(() => {
        Object.keys(keysRef.current.keys).forEach(key => {
            delete keysRef.current.keys[key]
        })
    }, []))

    return (
        <Context.Provider value={{
            keysRef,
        }}>
            {children}
        </Context.Provider>
    )
}
