const spanName = document.getElementById("spanName");
const spanEmail = document.getElementById("spanEmail");

const formName = document.getElementById("change-name-form");
const newName = document.getElementById("new-name");

const logOutBtn = document.getElementById("logout-btn");

const formPassword = document.getElementById("change-password-form");
const currentPassword = document.getElementById("current-password");
const newPassword = document.getElementById("new-password");
const confirmPassword = document.getElementById("confirm-password");

const resetInputs = () => {
  const array = [currentPassword, newPassword, confirmPassword];
  array.forEach((item) => {
    if (item.classList.contains("inputWrong"))
      item.classList.remove("inputWrong");
  });
};

const getEmailName = async () => {
  const {
    data: { name, email },
  } = await axios.get("/profile/getEmailName");

  spanName.innerHTML = name;
  spanEmail.innerHTML = email;
};
getEmailName();

formName.addEventListener("submit", async (event) => {
  event.preventDefault();

  const {
    data: { success },
  } = await axios.patch(`profile/updateNameUser/${newName.value.trim()}`);

  if (success) {
    popUpMessage("name updated succesfully", true);
    getEmailName();
    newName.value = "";
  }
});

formPassword.addEventListener("submit", async (event) => {
  event.preventDefault();
  resetInputs();

  try {
    const { data } = await axios.patch("profile/updatePasswordUser", {
      currPassword: currentPassword.value.trim(),
      newPassword: newPassword.value.trim(),
      confPassword: confirmPassword.value.trim(),
    });

    if (data.success) {
      popUpMessage("Password updated successfully", true);
      formPassword.reset(); // Resetta il form dopo il successo
    } else if (!data.passwordsMatch) {
      popUpMessage("The passwords do not match", false);
    }
  } catch (error) {
    // Gestione degli errori dalla response
    if (error.response) {
      const { statusCode, msg } = error.response.data;

      if (statusCode === 401 && msg === "Current password is incorrect") {
        invalidParamForm(currentPassword, false);
        popUpMessage(msg, false);
      }

      if (
        statusCode === 400 &&
        msg === "password must be at lease 6 characters long"
      ) {
      }

      if (
        statusCode === 400 &&
        msg === "New password and confirmation do not match"
      ) {
        invalidParamForm(newPassword, false);
        invalidParamForm(confirmPassword, false);
        popUpMessage(msg, false);
      }

      if (
        statusCode === 400 &&
        msg === "New password cannot be the same as current password"
      ) {
        invalidParamForm(currentPassword, false);
        invalidParamForm(newPassword, false);
        invalidParamForm(confirmPassword, false);
        popUpMessage(msg, false);
      }

      if (
        statusCode === 500 &&
        msg === "password must be at lease 6 characters long"
      ) {
        invalidParamForm(newPassword, false);
        popUpMessage(msg, false);
      }
    }
  }
});
logOutBtn.addEventListener("click", async (event) => {
  const {
    data: { success },
  } = await axios.delete("/profile/logout");

  if (success) window.location.href = "/login";
});
