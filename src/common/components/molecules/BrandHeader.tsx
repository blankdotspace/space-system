import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../atoms/tooltip";
import { Tooltip, TooltipArrow } from "@radix-ui/react-tooltip";
import { FaExternalLinkAlt } from "react-icons/fa";
import { Londrina_Solid } from "next/font/google";
import { loadSystemConfig } from "@/config";

const Londrina = Londrina_Solid({ subsets: ["latin"], weight: "400" });

const BrandHeader = () => {
  const { assets, brand, navigation } = loadSystemConfig();
  const logoTooltip = navigation?.logoTooltip;
  const logoSrc = assets.logos.icon || assets.logos.main;

  const logoImage = (
    <div className="w-12 h-8 sm:w-16 sm:h-10 me-3 flex items-center justify-center">
      <Image
        src={logoSrc}
        alt={`${brand.displayName} Logo`}
        width={60}
        height={40}
        priority
        className="w-full h-full object-contain"
      />
    </div>
  );

  return (
    <>
      {logoTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <Link
              href="/home"
              className="flex items-center ps-2.5"
              rel="noopener noreferrer"
            >
              <TooltipTrigger asChild>{logoImage}</TooltipTrigger>
            </Link>
            <TooltipContent className="bg-gray-200 font-black" side="left">
              <TooltipArrow className="fill-gray-200" />
              <div className="flex flex-col gap-1">
                {logoTooltip.href ? (
                  <a
                    className={`text-black text-base ${Londrina.className}`}
                    href={logoTooltip.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {logoTooltip.text}
                    <FaExternalLinkAlt className="inline ml-1 mb-1" />
                  </a>
                ) : (
                  <span className={`text-black text-base ${Londrina.className}`}>
                    {logoTooltip.text}
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Link
          href="/home"
          className="flex items-center ps-2.5"
          rel="noopener noreferrer"
        >
          {logoImage}
        </Link>
      )}

      {false && (
        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">
          Nounspace
        </span>
      )}
    </>
  );
};

export default BrandHeader;
