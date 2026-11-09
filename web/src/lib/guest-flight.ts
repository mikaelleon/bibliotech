export type GuestMark = { left: number; top: number; width: number; height: number };

export type GuestFlight = {
  x: number;
  y: number;
  from: GuestMark | null;
  at: number;
};

let flight: GuestFlight | null = null;

export function setGuestFlight(next: GuestFlight | null) {
  flight = next;
}

export function peekGuestFlight(): GuestFlight | null {
  return flight;
}

export function clearGuestFlight() {
  flight = null;
}
