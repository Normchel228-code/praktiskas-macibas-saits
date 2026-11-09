const nameLimit = 80;
const emailLimit = 254;
const messageLimit = 500;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u;
const emailPattern = /^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/u;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateFeedback(input) {
  const errors = {};
  let name = "";
  let email = "";
  let message = "";

  if (input != null) {
    name = cleanText(input.name);
    email = cleanText(input.email);
    message = cleanText(input.message);
  }

  if (!name) {
    errors.name = "Ievadi vārdu.";
  } else if (name.length > nameLimit) {
    errors.name = `Vārdā drīkst būt līdz ${nameLimit} rakstzīmēm.`;
  } else if (!namePattern.test(name)) {
    errors.name = "Ievadi vārdu ar burtiem.";
  }

  if (!email) {
    errors.email = "Ievadi e-pasta adresi.";
  } else if (email.length > emailLimit || !emailPattern.test(email)) {
    errors.email = "Ievadi derīgu e-pasta adresi.";
  }

  if (!message) {
    errors.message = "Ievadi atsauksmi.";
  } else if (message.length > messageLimit) {
    errors.message = `Atsauksmē drīkst būt līdz ${messageLimit} rakstzīmēm.`;
  }

  return errors;
}
