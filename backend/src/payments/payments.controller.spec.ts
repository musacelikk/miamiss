import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../entities';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const paytr = {
    enabled: true,
    verifyCallback: jest.fn(),
    startPayment: jest.fn(),
  };
  const ordersService = { setPaymentStatus: jest.fn() };
  const ordersRepo = { findOne: jest.fn() };
  const logs = { record: jest.fn() };
  const config = { get: (k: string) => (k === 'PUBLIC_SITE_URL' ? 'http://site' : undefined) };

  const controller = new PaymentsController(
    paytr as never,
    ordersService as never,
    ordersRepo as never,
    logs as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('config kart durumunu doner', () => {
    expect(controller.getConfig()).toEqual({ cardEnabled: true });
  });

  it('callback gecersiz hash ile reddedilir', async () => {
    paytr.verifyCallback.mockReturnValue(false);
    await expect(controller.callback({ merchant_oid: 'X' })).rejects.toThrow(BadRequestException);
    expect(ordersService.setPaymentStatus).not.toHaveBeenCalled();
  });

  it('callback success siparisi PAID yapar ve OK doner', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({
      id: 'o1',
      paymentStatus: PaymentStatus.PENDING,
      orderNo: 'MIA-1',
      email: 'a@b.com',
    });
    const res = await controller.callback({
      merchant_oid: 'MIAX',
      status: 'success',
      total_amount: '100',
      hash: 'h',
    });
    expect(ordersService.setPaymentStatus).toHaveBeenCalledWith('o1', PaymentStatus.PAID);
    expect(res).toBe('OK');
  });

  it('callback zaten PAID siparis icin tekrar islem yapmaz (idempotent)', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentStatus: PaymentStatus.PAID });
    const res = await controller.callback({
      merchant_oid: 'MIAX',
      status: 'success',
      total_amount: '100',
      hash: 'h',
    });
    expect(ordersService.setPaymentStatus).not.toHaveBeenCalled();
    expect(res).toBe('OK');
  });

  it('callback failed siparisi FAILED yapar', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({
      id: 'o1',
      paymentStatus: PaymentStatus.PENDING,
      orderNo: 'MIA-1',
      email: 'a@b.com',
    });
    await controller.callback({
      merchant_oid: 'MIAX',
      status: 'failed',
      total_amount: '0',
      hash: 'h',
    });
    expect(ordersService.setPaymentStatus).toHaveBeenCalledWith('o1', PaymentStatus.FAILED);
  });

  it('start yanlis odeme yontemli siparisi reddeder', async () => {
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentMethod: 'BANK_TRANSFER' });
    await expect(
      controller.start(
        {
          orderId: 'o1',
          cardHolder: 'A B',
          cardNumber: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '30',
          cvv: '000',
        },
        { ip: '1.2.3.4' } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
