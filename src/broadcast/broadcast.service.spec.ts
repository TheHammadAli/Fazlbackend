import { Types } from "mongoose";
import { BroadcastService } from "./broadcast.service";

describe("BroadcastService", () => {
  it("should be defined", () => {
    const service = new BroadcastService(
      {} as any,
      { updateMany: jest.fn(), find: jest.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    expect(service).toBeDefined();
  });

  it("marks unread thread messages as read for the current user when opening the thread", async () => {
    const updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    });
    const sort = jest.fn().mockResolvedValue([{ _id: "msg-1" }]);
    const populate = jest.fn().mockReturnThis();
    const find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ sort }),
      }),
    });

    const messageModel = { updateMany, find } as any;
    const service = new BroadcastService(
      {} as any,
      messageModel,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.getThreadMessages("thread-1", "user-1");

    expect(updateMany).toHaveBeenCalledWith(
      {
        thread: new Types.ObjectId("thread-1"),
        receiver: new Types.ObjectId("user-1"),
        isRead: false,
      },
      { $set: { isRead: true } },
    );
  });
});
