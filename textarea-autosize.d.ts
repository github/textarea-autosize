interface Subscription {
  unsubscribe(): void
}

export default function autosize(textarea: HTMLTextAreaElement): Subscription
