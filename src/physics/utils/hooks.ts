import {MutableRefObject, useCallback, useEffect, useRef} from "react";

export const useEffectRef = <T>(value: T) => {
    const ref = useRef(value)
    useEffect(() => {
        ref.current = value
    }, [value])
    return ref
}

export const useSubscriptionCallbacks = () => {

    const localStateRef = useRef<{
        subscriptions: Record<string, MutableRefObject<any>>,
        idCount: number,
    }>({
        subscriptions: {},
        idCount: 0,
    })

    const subscribe = useCallback((callbackRef: MutableRefObject<any>) => {
        const id = localStateRef.current.idCount += 1
        localStateRef.current.subscriptions[id] = callbackRef
        return () => {
            delete localStateRef.current.subscriptions[id]
        }
    }, [])

    const callSubscriptions = useCallback((...params) => {
        Object.values(localStateRef.current.subscriptions).forEach(callbackRef => {
            callbackRef.current(...params)
        })
    }, [])

    return {
        subscribe,
        callSubscriptions,
    }

}
