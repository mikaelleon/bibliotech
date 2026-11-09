type Listener = (bookIds: string[]) => void;

const listeners = new Set<Listener>();

/** Opens the collection checkbox picker. The host lives in the app shell. */
export function openCollectionPicker(bookIds: string[]) {
  for (const listener of listeners) listener(bookIds);
}

export function subscribeCollectionPicker(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
