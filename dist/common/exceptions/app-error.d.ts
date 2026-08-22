export declare class AppError extends Error {
    readonly code: string;
    readonly status: number;
    readonly originalError?: any | undefined;
    constructor(message: string, code?: string, status?: number, originalError?: any | undefined);
}
