import { HttpException } from '@nestjs/common';
import type { ApiErrorCode } from '../../../common/errors/api-error';

export const imageError = (code: ApiErrorCode, status: number, message: string) => new HttpException({ code, message, details: {} }, status);
export const invalidImage = () => imageError('COMMERCE_IMAGE_INVALID', 422, 'The image or upload fields are invalid.');
export const imageTooLarge = () => imageError('COMMERCE_IMAGE_TOO_LARGE', 413, 'The image exceeds the allowed size.');
export const storageUnavailable = () => imageError('COMMERCE_IMAGE_STORAGE_UNAVAILABLE', 503, 'Product image storage is unavailable.');
export const revisionConflict = () => imageError('COMMERCE_IMAGE_REVISION_CONFLICT', 412, 'The product image changed; reload its current metadata.');
export const imageMissing = () => imageError('COMMERCE_IMAGE_NOT_FOUND', 404, 'The product image was not found.');
