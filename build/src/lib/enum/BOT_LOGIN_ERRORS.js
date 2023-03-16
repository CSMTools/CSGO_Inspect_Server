var Errors;
(function (Errors) {
    Errors[Errors["Invalid Password"] = 61] = "Invalid Password";
    Errors[Errors["Account login denied due to 2FA failure. If using email auth, an email has been sent."] = 63] = "Account login denied due to 2FA failure. If using email auth, an email has been sent.";
    Errors[Errors["Account login denied due to auth code being invalid"] = 65] = "Account login denied due to auth code being invalid";
    Errors[Errors["Account login denied due to 2FA failure and no mail has been sent"] = 66] = "Account login denied due to 2FA failure and no mail has been sent";
})(Errors || (Errors = {}));
export default Errors;
