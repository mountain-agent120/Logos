
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot = () => {
    return (
        <>
            <Composition
                id="MyComp"
                component={MyComposition}
                durationInFrames={360}
                fps={30}
                width={1280}
                height={720}
            />
        </>
    );
};
