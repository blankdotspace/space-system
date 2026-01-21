import VerifiedNft from "@/common/components/atoms/icons/VerifiedNft";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/common/components/atoms/tooltip";
import AlchemyChainSelector from "@/common/components/molecules/AlchemyChainSelector";
import AlchemyNftSelector, {
  AlchemyNftSelectorValue,
} from "@/common/components/molecules/AlchemyNFTSelector";
import ColorSelector from "@/common/components/molecules/ColorSelector";
import ImageScaleSlider from "@/common/components/molecules/ImageScaleSlider";
import ImgBBUploader from "@/common/components/molecules/ImgBBUploader";
import MediaSourceSelector, {
  MediaSource,
  MediaSourceTypes,
} from "@/common/components/molecules/MediaSourceSelector";
import TextInput from "@/common/components/molecules/TextInput";
import {
  FidgetArgs,
  FidgetModule,
  FidgetProperties,
  type FidgetSettingsStyle,
} from "@/common/fidgets";
import { Color } from "@/common/lib/theme";
import { defaultStyleFields, ErrorWrapper, WithMargin } from "@/fidgets/helpers";
import React, { CSSProperties, useEffect, useState } from "react";

export type GalleryFidgetSettings = {
  imageUrl: string;
  uploadedImage: string;
  Link: string;
  Scale: number;
  selectMediaSource: MediaSource;
  nftAddress: string;
  nftTokenId: string;
  network: AlchemyNetwork;
  nftSelector: AlchemyNftSelectorValue;
  badgeColor: Color;
} & FidgetSettingsStyle;

const galleryConfig: FidgetProperties = {
  fidgetName: "Image",
  icon: 0x1f5bc,
  fields: [
    {
      fieldName: "selectMediaSource",
      displayName: "Source",
      inputSelector: (props) => (
        <WithMargin>
          <MediaSourceSelector {...props} />
        </WithMargin>
      ),
      required: false,
      default: { name: MediaSourceTypes.URL },
      group: "settings",
    },
    {
      fieldName: "imageUploader",
      displayName: "Upload Image",
      inputSelector: ({ updateSettings }) => {
        const [localImageUrl, setLocalImageUrl] = React.useState<string | null>(null);

        const handleImageUploaded = (Upload: string) => {
          console.log("Image uploaded, URL:", Upload);
          setLocalImageUrl(Upload);
          console.log(localImageUrl);
          updateSettings?.({
            uploadedImage: Upload,
            imageUrl: Upload
          });
        };

        return (
          <WithMargin>
            <div className="flex flex-col gap-4">
              <ImgBBUploader onImageUploaded={handleImageUploaded} />
            </div>
          </WithMargin>
        );
      },
      required: false,
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.UPLOAD,
    },
    {
      fieldName: "imageUrl",
      displayName: "Image URL",
      displayNameHint: "Right click on a publicly hosted image to copy its address, then paste the image address here.",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      default:
        "https://storage.googleapis.com/papyrus_images/d467b07030969fab95a8f44b1de596ab.png",
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.URL,
    },
    {
      fieldName: "network",
      displayName: "Network",
      displayNameHint: "Choose the blockchain network where your NFTs are stored.",
      inputSelector: (props) => (
        <WithMargin>
          <AlchemyChainSelector {...props} />
        </WithMargin>
      ),
      required: true,
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.EXTERNAL,
    },
    {
      fieldName: "nftSelector",
      displayName: "NFT",
      displayNameHint: "Select a verified wallet address to view your NFTs.",
      inputSelector: (props) => (
        <WithMargin>
          <AlchemyNftSelector {...props} />
        </WithMargin>
      ),
      required: true,
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.WALLET,
    },
    {
      fieldName: "nftAddress",
      displayName: "Collection Address",
      displayNameHint: "Contract address of the NFT collection",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      default: "",
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.EXTERNAL,
    },
    {
      fieldName: "nftTokenId",
      displayName: "Token ID",
      displayNameHint: "Unique identifier of the NFT within the collection",
      required: true,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      default: "",
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.EXTERNAL,
    },
    {
      fieldName: "Scale",
      displayName: "Scale",
      displayNameHint: "Adjust the image size",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ImageScaleSlider {...props} />
        </WithMargin>
      ),
      default: 1,
      group: "style",
    },
    {
      fieldName: "Link",
      displayName: "Links To",
      displayNameHint: "URL to open when image is clicked",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <TextInput {...props} />
        </WithMargin>
      ),
      default: "",
      group: "settings",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name === MediaSourceTypes.UPLOAD,
    },
    {
      fieldName: "badgeColor",
      displayName: "Badge Color",
      displayNameHint: "Color for the verification badge",
      required: false,
      inputSelector: (props) => (
        <WithMargin>
          <ColorSelector {...props} />
        </WithMargin>
      ),
      group: "style",
      default: "rgb(55, 114, 249)",
      disabledIf: (settings) =>
        settings?.selectMediaSource?.name !== MediaSourceTypes.WALLET,
    },
    ...defaultStyleFields,
  ],
  size: {
    minHeight: 1,
    maxHeight: 36,
    minWidth: 1,
    maxWidth: 36,
  },
};

export type AlchemyNetwork =
  | "eth"
  | "polygon"
  | "opt"
  | "arb"
  | "base"
  | "starknet"
  | "astar"
  | "frax"
  | "zora";

export const getAlchemyChainUrlV3 = (network: AlchemyNetwork) => {
  return `https://${network}-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
};

const Gallery: React.FC<FidgetArgs<GalleryFidgetSettings>> = ({ settings }) => {
  const [nftImageUrl, setNftImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [badgeColor, setBadgeColor] = useState<Color>(settings.badgeColor);
  const [uploadedImage, setuploadedImage] = useState<string | null>(settings.uploadedImage || null);

  React.useEffect(() => {
    if (uploadedImage) {
      localStorage.setItem('galleryuploadedImage', uploadedImage);
    }

    window.handleGalleryImageUpload = (url: string) => {
      console.log("Global handler called with URL:", url);
      setuploadedImage(url);
      localStorage.setItem('galleryuploadedImage', url);
    };

    return () => {
      delete window.handleGalleryImageUpload;
    };
  }, [uploadedImage]);

  React.useEffect(() => {
    const savedImageUrl = localStorage.getItem('galleryuploadedImage');
    if (savedImageUrl && settings.selectMediaSource?.name === MediaSourceTypes.UPLOAD) {
      setuploadedImage(savedImageUrl);
    }
  }, [settings.selectMediaSource?.name]);

  const mediaSourceName = settings.selectMediaSource?.name;

  useEffect(() => {
    if (settings.selectMediaSource?.name === MediaSourceTypes.EXTERNAL) {
      const fetchNFTData = async () => {
        const { nftAddress, nftTokenId, network } = settings;
        const base_url = getAlchemyChainUrlV3(network);
        const url = `${base_url}/getNFTMetadata?contractAddress=${nftAddress}&tokenId=${nftTokenId}&refreshCache=false`;
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { accept: "application/json" },
          });
          const data = await response.json();
          if (data.image && data.image.cachedUrl) {
            setNftImageUrl(data.image.cachedUrl);
            setError(null);
          } else {
            setError(
              "Error fetching image from NFT. Make sure the Network, Contract Address, and Token ID are all correct.",
            );
          }
        } catch (err) {
          setError(
            "Error fetching image from NFT. Make sure the Network, Contract Address, and Token ID are all correct.",
          );
        }
      };

      fetchNFTData();
    } else if (settings.selectMediaSource?.name === MediaSourceTypes.URL) {
      setNftImageUrl(settings.imageUrl);
      setError(null);
    } else if (settings.selectMediaSource?.name === MediaSourceTypes.WALLET) {
      setNftImageUrl(settings.nftSelector?.imageUrl || "");
      setError(null);
    } else if (settings.selectMediaSource?.name === MediaSourceTypes.UPLOAD) {
      if (uploadedImage) {
        console.log("Using local uploaded image URL:", uploadedImage);
        setNftImageUrl(uploadedImage);
        setError(null);
      } else if (settings.uploadedImage) {
        setNftImageUrl(settings.uploadedImage);
        setError(null);
      } else {
        setError("Please upload an image");
      }
    } else {
      setNftImageUrl(null);
      setError("Please select a media source.");
    }
  }, [
    mediaSourceName,
    settings.imageUrl,
    settings.nftSelector?.imageUrl,
    settings.nftAddress,
    settings.nftTokenId,
    settings.network,
    settings.uploadedImage,
    uploadedImage,
  ]);

  useEffect(() => {
    setBadgeColor(settings.badgeColor);
  }, [settings.badgeColor]);

  const contentStyle = {
    backgroundImage: `url(${nftImageUrl})`,
    display: error ? "none" : "block",
    transform: `scale(${settings.Scale})`,
    transition: "transform 0.3s ease",
  } as CSSProperties;

  const errorStyle = {
    color: "red",
    textAlign: "center",
    marginTop: "10px",
  } as CSSProperties;

  const wrapperStyle = {
    overflow: "hidden",
  } as CSSProperties;

  const redirectUrl = settings.Link?.trim();

  return redirectUrl ? (
    <a
      href={redirectUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute inset-0"
    >
      <div
        className="rounded-md flex-1 items-center justify-center relative size-full"
        style={wrapperStyle}
      >
        <div
          className="bg-cover bg-center w-full h-full"
          style={contentStyle}
        ></div>
        {settings.selectMediaSource?.name === MediaSourceTypes.WALLET ? (
          <div className="absolute bottom-2 right-2 flex h-fit w-fit">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <VerifiedNft color={badgeColor} />
                </TooltipTrigger>
                <TooltipContent side="left">Verified Owner</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null}
        {error && <div style={errorStyle}>{error}</div>}
      </div>
    </a>
  ) : (
    <div
      className="rounded-md flex-1 items-center justify-center relative size-full"
      style={wrapperStyle}
    >
      <div
        className="bg-cover bg-center w-full h-full"
        style={contentStyle}
      ></div>
      {settings.selectMediaSource?.name === MediaSourceTypes.WALLET ? (
        <div className="absolute bottom-2 right-2 flex h-fit w-fit">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <VerifiedNft color={badgeColor} />
              </TooltipTrigger>
              <TooltipContent side="left">Verified Owner</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ) : null}
      {error && <ErrorWrapper icon="⚠️" message={error} />}
    </div>
  );
};

export default {
  fidget: Gallery,
  properties: galleryConfig,
} as FidgetModule<FidgetArgs<GalleryFidgetSettings>>;
