import { createWorkerApp } from "./createWorkerApp"
import * as Planckjs from "./physics/planckjs"
import {useOnPhysicsUpdate as useOnWorkerPhysicsUpdate, usePhysicsRef} from "./physics/PhysicsConsumer";
import {useAddBody, useOnPhysicsUpdate} from "./physics/PhysicsProvider";

export default {
    ...Planckjs,
    createWorkerApp,
    usePhysicsRef,
    useOnWorkerPhysicsUpdate,
    useOnPhysicsUpdate,
    useAddBody,
}
