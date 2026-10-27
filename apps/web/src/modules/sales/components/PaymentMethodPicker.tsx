import { PAYMENT_METHODS, formatPaymentMethod, type PaymentMethod } from '@kofi/contracts';

export function PaymentMethodPicker({
  value,
  busy,
  onChange,
}: {
  value: PaymentMethod | null;
  busy: boolean;
  onChange(value: PaymentMethod): void;
}) {
  return (
    <fieldset disabled={busy} className="sale-payment">
      <legend>Medio de pago</legend>
      {PAYMENT_METHODS.map((method) => (
        <label key={method} className="sale-payment__option">
          <input
            type="radio"
            name="sale-payment"
            value={method}
            checked={value === method}
            onChange={() => onChange(method)}
          />
          {formatPaymentMethod(method)}
        </label>
      ))}
    </fieldset>
  );
}
