import React, {createContext} from "react";
import {World} from "planck";

const Context = createContext<{
    world: World,
}>(null!)

export const BodiesProvider: React.FC<{
    world: World,
}> = ({children, world}) => {

    return (
        <Context.Provider value={{
            world,
        }}>
            {children}
        </Context.Provider>
    )
}
