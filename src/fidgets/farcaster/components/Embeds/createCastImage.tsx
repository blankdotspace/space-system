import React, { useState, useCallback } from "react";
import { PhotoIcon } from "@heroicons/react/24/solid";
import ExpandOnClick from "@/common/components/molecules/ExpandOnClick";
import { mergeClasses } from "@/common/lib/utils/mergeClasses";

const LoadingPlaceholder = () => {
    return (
        <div className="h-60 w-full flex items-center justify-center py-10 px-20 animate-pulse bg-primary/10">
            <PhotoIcon className="h-12 w-12 text-foreground/20" />
        </div>
    );
};

const CreateCastImage = ({ url }: { url: string }) => {
    const [isLoading, setIsLoading] = useState(true);

    const onLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    const onError = useCallback(() => {
        console.debug("error loading image", url);
        setIsLoading(false);
    }, []);

    return (
        <ExpandOnClick>
            <img
                className={mergeClasses(
                    "object-contain size-full max-h-[200px]", // Adjusted max height
                    isLoading && "hidden",
                )}
                src={url}
                onLoad={onLoad}
                onError={onError}
                referrerPolicy="no-referrer"
                alt=""
            />
            {isLoading && <LoadingPlaceholder />}
        </ExpandOnClick>
    );
};

export default CreateCastImage;
