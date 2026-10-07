import { SetMetadata } from "@nestjs/common"

export const IS_PUBLIC = Symbol("IS_PUBLIC")

/** La ruta no exige sesión. Todo lo demás la exige por defecto. */
export const Public = () => SetMetadata(IS_PUBLIC, true)
