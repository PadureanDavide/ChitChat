const popUpResult = document.querySelector(".popUpResult");

const popUpMessage = (mess, typeResult) => {
  popUpResult.innerHTML = mess;
  let classToManipulate;
  if (typeResult) {
    classToManipulate = "showPopUpSuccess";
    popUpResult.classList.add(classToManipulate);
  } else {
    classToManipulate = "showPopUpDenied";
    popUpResult.classList.add(classToManipulate);
  }

  // Rimuovi la classe dopo 5 secondi
  setTimeout(() => {
    popUpResult.classList.remove(classToManipulate);
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
