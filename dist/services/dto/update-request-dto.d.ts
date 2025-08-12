export declare class UpdateRequestStatusDto {
    requestId: string;
    action: 'accept' | 'reject' | 'cancel' | 'propose' | 'confirm';
    proposedDateTime?: string;
}
