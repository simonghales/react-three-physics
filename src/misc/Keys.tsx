import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from "react"
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
    subscribeToKeyDown: (key: string, callback: () => void) => void,
    subscribeToKeyUp: (key: string, callback: () => void) => void,
}>(null!)

export const useOnKeyDown = (key: string, callback: () => void) => {

    const {
        subscribeToKeyDown
    } = useContext(Context)

    useEffect(() => {
        return subscribeToKeyDown(key, callback)
    }, [key, callback])

}

export const useOnKeyUp = (key: string, callback: () => void) => {

    const {
        subscribeToKeyUp
    } = useContext(Context)

    useEffect(() => {
        return subscribeToKeyUp(key, callback)
    }, [key, callback])

}

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

    const [localState] = useState({
        onKeyDownSubscriptions: new Map<string, Map<any, any>>(),
        onKeyUpSubscriptions: new Map<string, Map<any, any>>(),
    })

    const {
        subscribeToKeyDown,
        subscribeToKeyUp,
    } = useMemo(() => {
        return {
            subscribeToKeyDown: (key: string, callback: any) => {
                if (!localState.onKeyDownSubscriptions.get(key)) {
                    localState.onKeyDownSubscriptions.set(key, new Map<any, any>())
                }
                (localState.onKeyDownSubscriptions.get(key)!).set(callback, callback)
                return () => {
                    (localState.onKeyDownSubscriptions.get(key)!).delete(callback)
                }
            },
            subscribeToKeyUp: (key: string, callback: any) => {
                if (!localState.onKeyUpSubscriptions.get(key)) {
                    localState.onKeyUpSubscriptions.set(key, new Map<any, any>())
                }
                (localState.onKeyUpSubscriptions.get(key)!).set(callback, callback)
                return () => {
                    (localState.onKeyUpSubscriptions.get(key)!).delete(callback)
                }
            },
        }
    }, [])

    useOnCustomMessage(MESSAGE_KEY.KEY_PRESS, (data: {
        keyCode: any,
        repeat: boolean,
        type: string,
    }) => {
        const keydown = data.type === 'keydown'
        const prevKeydown = keysRef.current.keys[data.keyCode] ?? false
        keysRef.current.keys[data.keyCode] = keydown

        if (keydown && !prevKeydown) {
            const map = localState.onKeyDownSubscriptions.get(data.keyCode)
            if (map) {
                map.forEach(callback => {
                    callback()
                })
            }
        } else if (!keydown && prevKeydown) {
            const map = localState.onKeyUpSubscriptions.get(data.keyCode)
            if (map) {
                map.forEach(callback => {
                    callback()
                })
            }
        }

    })

    useOnCustomMessage(MESSAGE_KEY.WINDOW_BLUR, useCallback(() => {
        Object.keys(keysRef.current.keys).forEach(key => {
            delete keysRef.current.keys[key]
        })
    }, []))

    return (
        <Context.Provider value={{
            keysRef,
            subscribeToKeyDown,
            subscribeToKeyUp,
        }}>
            {children}
        </Context.Provider>
    )
}
