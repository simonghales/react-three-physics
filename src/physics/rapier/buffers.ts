import {lerp} from "../utils/numbers";
import {Quaternion, Vector3, RigidBody} from "@dimforge/rapier3d-compat";

export type RapierBuffersData = {
    positions: Float32Array,
    quaternions: Float32Array,
}

export const generateRapierBuffers = (maxNumberOfPhysicsObjects: number): RapierBuffersData => {
    return {
        positions: new Float32Array(maxNumberOfPhysicsObjects * 3),
        quaternions: new Float32Array(maxNumberOfPhysicsObjects * 4),
    };
}

export type RapierBodyData = {
    position: Vector3,
    quaternion: Quaternion,
}

export const copyRapierBodyData = (bodyData: RapierBodyData, targetBodyData?: RapierBodyData): RapierBodyData => {
    if (!targetBodyData) {
        return {
            position: new Vector3(bodyData.position.x, bodyData.position.y, bodyData.position.z),
            quaternion: new Quaternion(bodyData.quaternion.x, bodyData.quaternion.y, bodyData.quaternion.z, bodyData.quaternion.w),
        }
    }

    targetBodyData.position.x = bodyData.position.x
    targetBodyData.position.y = bodyData.position.y
    targetBodyData.position.z = bodyData.position.z

    targetBodyData.quaternion.x = bodyData.quaternion.x
    targetBodyData.quaternion.y = bodyData.quaternion.y
    targetBodyData.quaternion.z = bodyData.quaternion.z
    targetBodyData.quaternion.w = bodyData.quaternion.w

    return targetBodyData
}

let tempPos
let tempQ

export const getRapierBodyData = (body: RigidBody, targetBodyData?: RapierBodyData): RapierBodyData => {
    if (!targetBodyData) {
        return {
            position: body.translation(),
            quaternion: body.rotation(),
        }
    }
    tempPos = body.translation()
    tempQ = body.rotation()
    targetBodyData.position.x = tempPos.x
    targetBodyData.position.y = tempPos.y
    targetBodyData.position.z = tempPos.z
    targetBodyData.quaternion.x = tempQ.x
    targetBodyData.quaternion.y = tempQ.y
    targetBodyData.quaternion.z = tempQ.z
    targetBodyData.quaternion.w = tempQ.w
    return targetBodyData
}

let xPos: number = 0
let yPos: number = 0
let zPos: number = 0

let xQ: number = 0
let yQ: number = 0
let zQ: number = 0
let wQ: number = 0

let xIndex: number = 0
let yIndex: number = 0
let zIndex: number = 0

let xQIndex: number = 0
let yQIndex: number = 0
let zQIndex: number = 0
let wQIndex: number = 0

export const convertRapierBodyDataToBufferData = (prevBodyData: RapierBodyData | undefined, currentBodyData: RapierBodyData | undefined, buffers: RapierBuffersData, bodyIndex: number, progress: number) => {

    if (!currentBodyData) return

    xPos = currentBodyData.position.x
    yPos = currentBodyData.position.y
    zPos = currentBodyData.position.z

    xQ = currentBodyData.quaternion.x
    yQ = currentBodyData.quaternion.y
    zQ = currentBodyData.quaternion.z
    wQ = currentBodyData.quaternion.w

    xIndex = bodyIndex * 3
    yIndex = (bodyIndex * 3) + 1
    zIndex = (bodyIndex * 3) + 2

    xQIndex = (bodyIndex * 4)
    yQIndex = (bodyIndex * 4) + 1
    zQIndex = (bodyIndex * 4) + 2
    wQIndex = (bodyIndex * 4) + 3

    if (prevBodyData) {
        xPos = lerp(prevBodyData.position.x, currentBodyData.position.x, progress)
        yPos = lerp(prevBodyData.position.y, currentBodyData.position.y, progress)
        zPos = lerp(prevBodyData.position.z, currentBodyData.position.z, progress)
        // todo - lerp quaternion...
    }

    buffers.positions[xIndex] = xPos
    buffers.positions[yIndex] = yPos
    buffers.positions[zIndex] = zPos

    buffers.quaternions[xQIndex] = xQ
    buffers.quaternions[yQIndex] = yQ
    buffers.quaternions[zQIndex] = zQ
    buffers.quaternions[wQIndex] = wQ

}
