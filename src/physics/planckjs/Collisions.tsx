import {Contact, Fixture, World } from "planck"
import React, {createContext, MutableRefObject, useCallback, useContext, useEffect, useRef} from "react"
import {useEffectRef} from "../utils/hooks";

export const getFixtureData = (fixture: Fixture): any | null => {
    const userData = fixture.getUserData() as null | any;
    return userData || null;
};

export const getFixtureCollisionId = (data: any | null): string => {
    if (data && data['collisionId']) {
        return data.collisionId;
    }
    return '';
};

export const Context = createContext<{
    onCollisionBegin: (id: string, callback: any) => any,
    onCollisionEnd: (id: string, callback: any) => any,
}>(null!)

export const useCollisionsContext = () => {
    return useContext(Context)
}

export const useOnCollisionBegin = (id: string, callback: any) => {
    const callbackRef = useEffectRef(callback)
    const onCollisionBegin = useCollisionsContext().onCollisionBegin
    useEffect(() => {
        return onCollisionBegin(id, callbackRef)
    }, [])
}

export const useOnCollisionEnd = (id: string, callback: any) => {
    const callbackRef = useEffectRef(callback)
    const onCollisionEnd = useCollisionsContext().onCollisionEnd
    useEffect(() => {
        return onCollisionEnd(id, callbackRef)
    }, [])
}

export const PlanckjsCollisions: React.FC<{
    world: World,
    log?: boolean,
}> = ({children, world, log}) => {

    const localStateRef = useRef<{
        onCollisionBegin: Record<string, MutableRefObject<(fixture: Fixture, fixtureB: Fixture, contact: Contact) => void>>,
        onCollisionEnd: Record<string, MutableRefObject<(fixture: Fixture, fixtureB: Fixture, contact: Contact) => void>>,
    }>({
        onCollisionBegin: {},
        onCollisionEnd: {},
    })

    const onCollisionBegin = useCallback((id: string, callback: any) => {
        localStateRef.current.onCollisionBegin[id] = callback
        return () => {
            delete localStateRef.current.onCollisionBegin[id]
        }
    }, [])

    const onCollisionEnd = useCallback((id: string, callback: any) => {
        localStateRef.current.onCollisionEnd[id] = callback
        return () => {
            delete localStateRef.current.onCollisionEnd[id]
        }
    }, [])

    useEffect(() => {

        world.on('begin-contact', (contact: Contact) => {
            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();

            const aData = getFixtureData(fixtureA);
            const bData = getFixtureData(fixtureB);
            const aCollisionId = getFixtureCollisionId(aData);
            const bCollisionId = getFixtureCollisionId(bData);

            if (aCollisionId) {
                if (localStateRef.current.onCollisionBegin[aCollisionId]) {
                    localStateRef.current.onCollisionBegin[aCollisionId].current(fixtureB, fixtureA, contact)
                }
            }

            if (bCollisionId) {
                if (localStateRef.current.onCollisionBegin[bCollisionId]) {
                    localStateRef.current.onCollisionBegin[bCollisionId].current(fixtureA, fixtureB, contact)
                }
            }


        });

        world.on('end-contact', (contact: Contact) => {

            const fixtureA = contact.getFixtureA();
            const fixtureB = contact.getFixtureB();

            const aData = getFixtureData(fixtureA);
            const bData = getFixtureData(fixtureB);
            const aCollisionId = getFixtureCollisionId(aData);
            const bCollisionId = getFixtureCollisionId(bData);

            if (aCollisionId) {
                if (localStateRef.current.onCollisionEnd[aCollisionId]) {
                    localStateRef.current.onCollisionEnd[aCollisionId].current(fixtureB, fixtureA, contact)
                }
            }

            if (bCollisionId) {
                if (localStateRef.current.onCollisionEnd[bCollisionId]) {
                    localStateRef.current.onCollisionEnd[bCollisionId].current(fixtureA, fixtureB, contact)
                }
            }

        });

        return () => {
            console.log('todo unmount listeners...')
        }

    }, [world])

    return (
        <Context.Provider value={{
            onCollisionBegin: onCollisionBegin,
            onCollisionEnd: onCollisionEnd,
        }}>
            {children}
        </Context.Provider>
    )
}
