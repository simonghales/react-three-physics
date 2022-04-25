import {lerp} from "../utils/numbers";
import {Body, Quaternion, Vec3} from "cannon-es"

export type CannonBuffersData = {
    positions: Float32Array,
    quaternions: Float32Array,
}

export const generateCannonBuffers = (maxNumberOfPhysicsObjects: number): CannonBuffersData => {
    return {
        positions: new Float32Array(maxNumberOfPhysicsObjects * 3),
        quaternions: new Float32Array(maxNumberOfPhysicsObjects * 4),
    };
}

export type CannonBodyData = {
    position: Vec3,
    quaternion: Quaternion,
}

export const copyCannonBodyData = (bodyData: CannonBodyData, targetBodyData?: CannonBodyData): CannonBodyData => {
    if (!targetBodyData) {
        return {
            position: new Vec3(bodyData.position.x, bodyData.position.y, bodyData.position.z),
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

let tempPos = new Vec3()
let tempQ = new Quaternion()

export const getCannonBodyData = (body: Body, targetBodyData?: CannonBodyData): CannonBodyData => {
    if (!targetBodyData) {
        return {
            position: new Vec3().copy(body.position),
            quaternion: new Quaternion().copy(body.quaternion),
        }
    }
    tempPos.copy(body.position)
    tempQ.copy(body.quaternion)
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

export const convertCannonBodyDataToBufferData = (prevBodyData: CannonBodyData | undefined, currentBodyData: CannonBodyData | undefined, buffers: CannonBuffersData, bodyIndex: number, progress: number) => {

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
