const nameLimit = 80;
const emailLimit = 254;
const messageLimit = 500;
const namePattern = /^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u;
const emailPattern = /^[^\s@<>]+@[^\s@<>.]+(?:\.[^\s@<>.]+)+$/u;
const domainLabelPattern = /^[\p{L}\p{N}](?:[\p{L}\p{N}\p{M}-]{0,61}[\p{L}\p{N}\p{M}])?$/u;

function cleanText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  return "";
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
  } else if (
    email.length > emailLimit ||
    !emailPattern.test(email) ||
    !email.split("@")[1].split(".").every((label) => domainLabelPattern.test(label))
  ) {
    errors.email = "Ievadi derīgu e-pasta adresi.";
  }

  if (!message) {
    errors.message = "Ievadi atsauksmi.";
  } else if (message.length > messageLimit) {
    errors.message = `Atsauksmē drīkst būt līdz ${messageLimit} rakstzīmēm.`;
  }
  if (input?.days !== undefined) {
    if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365) {
      errors.days = "Jābūt pozitīvam skaitlim.";
    }
  }
  return errors;
}
