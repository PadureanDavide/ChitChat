document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("login");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = {
      email: loginForm.elements["email"].value,
      password: loginForm.elements["password"].value,
    };

    try {
      const {
        data: { success },
      } = await axios.post("/login", data);

      if (success) window.location.href = "/chat";
    } catch (e) {
      if (e.response.data.msg === "wrong password") {
        loginForm.elements["password"].value = "";

        invalidParamForm(loginForm.elements["password"].parentElement, false);
        popUpMessage("Incorrect password", false);
      }
    }
  });
});
