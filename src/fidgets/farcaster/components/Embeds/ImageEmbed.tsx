import React, { useCallback } from "react";
import ExpandOnClick from "@/common/components/molecules/ExpandOnClick";
import { LazyImage } from "../LazyLoad";

const ImageEmbed = ({ url }: { url: string }) => {
  const onError = useCallback(() => {
    console.debug("error loading image", url);
  }, [url]);

  const collapsedImage = (
    <LazyImage
      className="object-cover w-full h-full max-h-[500px] rounded-lg"
      src={url}
      onError={onError}
      referrerPolicy="no-referrer"
      alt="Embedded image"
    />
  );

  const expandedImage = (
      <LazyImage
        className="object-contain max-w-[95vw] max-h-[95vh] rounded-lg"
        src={url}
        onError={onError}
        referrerPolicy="no-referrer"
        alt="Embedded image"
      />
  );

  return (
    <ExpandOnClick expandedChildren={expandedImage}>
      {collapsedImage}
    </ExpandOnClick>
  );
};

export default ImageEmbed;
