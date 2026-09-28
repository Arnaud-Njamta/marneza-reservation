/**
 * Identité affichée d'une réservation.
 * Priorité : snapshot figé à la création (guest*) → fiche Customer (rétrocompat).
 * Évite qu'une nouvelle réservation au même email renomme toutes les anciennes.
 */
function guestFirstName(booking) {
  return booking?.guestFirstName || booking?.customer?.firstName || '';
}

function guestLastName(booking) {
  return booking?.guestLastName || booking?.customer?.lastName || '';
}

function guestFullName(booking) {
  return `${guestFirstName(booking)} ${guestLastName(booking)}`.trim();
}

function guestEmail(booking) {
  return booking?.guestEmail || booking?.customer?.email || '';
}

function guestPhone(booking) {
  return booking?.guestPhone || booking?.customer?.phone || '';
}

module.exports = {
  guestFirstName,
  guestLastName,
  guestFullName,
  guestEmail,
  guestPhone,
};
