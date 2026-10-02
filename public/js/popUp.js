const popUpResult = document.querySelector(".popUpResult");
let hidePopupTimeout;

const popUpMessage = (mess, typeResult) => {
  if (!popUpResult) {
    throw new Error("Popup message container is missing");
  }

  clearTimeout(hidePopupTimeout);
  popUpResult.classList.remove("showPopUpSuccess", "showPopUpDenied");
  popUpResult.textContent = mess;
  popUpResult.setAttribute("aria-live", typeResult ? "polite" : "assertive");
  popUpResult.setAttribute("aria-hidden", "false");
  popUpResult.classList.add(
    typeResult ? "showPopUpSuccess" : "showPopUpDenied",
  );

  hidePopupTimeout = setTimeout(() => {
    popUpResult.classList.remove("showPopUpSuccess", "showPopUpDenied");
    popUpResult.setAttribute("aria-hidden", "true");
  }, 3000);
};

const invalidParamForm = (element, success) => {
  if (!success) {
    if (!element.classList.contains("inputWrong"))
      element.classList.add("inputWrong");
  } else {
    if (element.classList.contains("inputWrong"))
      element.classList.remove("inputWrong");
  }
};
