import { Input, ModalWithButtons } from "@bobaboard/ui-components";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import classnames from "classnames";
import { useAuth } from "components/Auth";
import { useHotkeys } from "react-hotkeys-hook";

const LoginModal: React.FC<LoginModalProps> = (props) => {
  const { isPending, isLoggedIn, attemptLogin, attemptLogout, authError } =
    useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const onSubmit = () => {
    if (!isLoggedIn) {
      attemptLogin!(email, password).then((success: boolean) => {
        setPassword("");
        if (success) {
          setEmail("");
          props.onCloseModal();
        }
      });
    } else {
      attemptLogout!().then(() => {
        props.onCloseModal();
      });
    }
  };
  useHotkeys("enter", onSubmit, { enableOnTags: ["INPUT"] }, [email, password]);

  const [togglePassword, setTogglePassword] = React.useState(true);

  return (
    <ModalWithButtons
      isOpen={props.isOpen}
      onCloseModal={props.onCloseModal}
      onSubmit={onSubmit}
      color={props.color}
      primaryText={isLoggedIn ? "Logout" : "Login"}
      primaryDisabled={
        !isLoggedIn && (email.trim().length == 0 || password.length == 0)
      }
      secondaryText={"Cancel"}
      shouldCloseOnOverlayClick={true}
    >
      <>
        {!isLoggedIn && (
          <div className="login">
            <div className={classnames("inputs", { pending: isPending })}>
              <div>
                <Input
                  id={"email"}
                  value={email}
                  label={"Email"}
                  onTextChange={(text: string) => setEmail(text)}
                  color={props.color}
                />
              </div>
              <div className="password-wrapper">
                <div className="password-input">
                  <Input
                    id={"password"}
                    value={password}
                    label={"Password"}
                    onTextChange={(text: string) => setPassword(text)}
                    password={togglePassword}
                    color={props.color}
                  />
                </div>
                <div className="password-toggle">
                  <input
                    type="checkbox"
                    id="password-toggle"
                    onClick={() => setTogglePassword(!togglePassword)}
                    className="sr-only"
                  />
                  <label htmlFor="password-toggle" className="toggle-label">
                    {" "}
                    <FontAwesomeIcon
                      icon={togglePassword ? faEye : faEyeSlash}
                      className={classnames("icon")}
                      title={"label"}
                    />
                  </label>
                </div>
              </div>
              <div className={classnames("error", { hidden: !authError })}>
                {authError || "Hidden error field!"}
              </div>
            </div>
          </div>
        )}
        {isLoggedIn && (
          <div className="logout">
            <div>Pull the trigger, Piglet. </div>
          </div>
        )}
      </>
      <style jsx>{`
        .inputs {
          margin: 0 auto;
          margin-bottom: 15px;
          width: 100%;
        }
        .inputs > div:first-child {
          margin-bottom: 15px;
        }
        .buttons {
          display: flex;
          justify-content: flex-end;
        }
        .buttons > div {
          margin-left: 15px;
        }
        .error {
          color: red;
          margin-top: 10px;
          margin-left: 20px;
          font-size: small;
        }
        .error.hidden {
          visibility: hidden;
        }
        .toggle-label {
          background-color: pink;
          cursor: pointer;
          font-size: 2rem;
          display: grid;
          height: 100%;
          justify-content: center;
          align-items: center;
        }
        .password-wrapper {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }
        .password-input {
          grid-column: 1 / -1;
        }
        .password-toggle {
          grid-column: -1 / -2;
          z-index: 2;
        }
        .password-input,
        .password-toggle {
          grid-row: 1 / 2;
        }
        .sr-only {
          position: absolute;
          clip: rect(1px, 1px, 1px, 1px);
          padding: 0;
          border: 0;
          height: 1px;
          width: 1px;
          overflow: hidden;
        }
      `}</style>
    </ModalWithButtons>
  );
};

export interface LoginModalProps {
  isOpen: boolean;
  onCloseModal: () => void;
  color?: string;
}

export default LoginModal;
