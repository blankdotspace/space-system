import React from "react";
import Image from "next/image";

export default function SpaceNotFound({ src = "/ui/UserNotFound.png" }) {
  return (
    <div className="flex w-full h-full">
      <div className="w-full transition-all duration-100 ease-out p-8 flex">
        <div className="col-span-6 md:col-span-4 lg:col-span-3 aspect-video w-full bg-gray-100 relative self-center">
          <Image
            src={src}
            alt="User not found"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
