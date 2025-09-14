document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("register");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = {
      name: registerForm.elements["name"].value,
      email: registerForm.elements["email"].value,
      password: registerForm.elements["password"].value,
    };

    try {
      const {
        data: { success },
      } = await axios.post("/register", data);

      if (success) window.location.href = "/login";
    } catch (e) {
      if (
        e.response.data.msg === "password must be at lease 6 characters long"
      ) {
        registerForm.elements["password"].value = "";
        popUpMessage(e.response.data.msg, false);
        invalidParamForm(
          registerForm.elements["password"].parentElement,
          false
        );
      }

      if (
        e.response.data.msg ===
        "this email is already used, please login or user another one"
      ) {
        popUpMessage(e.response.data.msg, false);
        invalidParamForm(registerForm.elements["email"].parentElement, false);
      }
    }
  });
});
