'use client';

import { CLIENT_WORKFLOW_STEPS, clientStepIndex } from '@/lib/booking-status';

type Props = {
  status: string;
};

export function BookingStatusStepper({ status }: Props) {
  const isTerminal = ['cancelled', 'refused'].includes(status);
  const activeIndex = clientStepIndex(status);

  if (isTerminal) {
    return (
      <div className="booking-stepper booking-stepper--terminal">
        <span className={`badge ${status === 'cancelled' ? 'badge-cancelled' : 'badge-refused'}`}>
          {status === 'cancelled' ? 'Annulée' : 'Refusée'}
        </span>
      </div>
    );
  }

  return (
    <ol className="booking-stepper" aria-label="Progression de la réservation">
      {CLIENT_WORKFLOW_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        const isUpcoming = index > activeIndex;

        return (
          <li
            key={step.key}
            className={[
              'booking-step',
              isDone ? 'booking-step--done' : '',
              isActive ? 'booking-step--active' : '',
              isUpcoming ? 'booking-step--upcoming' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="booking-step__dot" aria-hidden="true">
              {isDone ? '✓' : index + 1}
            </span>
            <span className="booking-step__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
