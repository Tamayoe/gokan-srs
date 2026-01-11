import {THEME} from "../commons/theme";
import {Logo} from "./Logo";

export function SetupHeader() {
    return (
        <div className="text-center mb-16">
            <Logo className="justify-center mb-6" />
            <p
                className="text-sm"
                style={{
                    color: THEME.colors.secondary,
                    fontFamily: THEME.fonts.serif,
                }}
            >
                A focused vocabulary learning system
            </p>
        </div>
    );
}