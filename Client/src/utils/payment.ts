// Only non-sensitive card data ever leaves the browser. The full number and CVV
// are used for client-side validation only.
// TODO: replace with a real payment gateway (Stripe Elements / PayHere) before going live.
export interface CardInput {
    cardNumber: string;
    expiryDate: string;
    cvv?: string;
    cardHolder?: string;
}

export const toPaymentDetails = (card: CardInput) => ({
    last4: card.cardNumber.replace(/\D/g, '').slice(-4),
    expiryDate: card.expiryDate,
    cardHolder: card.cardHolder,
});
