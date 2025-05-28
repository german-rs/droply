import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

function isFileObject(item: any): item is { fileId: string } {
  return item && typeof item.fileId === 'string';
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trashedFiles = await db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.isTrash, true)));

    if (trashedFiles.length === 0) {
      return NextResponse.json(
        { message: "No files in trash" },
        { status: 200 }
      );
    }
    const deletePromises = trashedFiles
      .filter((file) => !file.isFolder) 
      .map(async (file) => {
        try {
          let imagekitFileId = null;

          if (file.fileUrl) {
            const urlWithoutQuery = file.fileUrl.split("?")[0];
            imagekitFileId = urlWithoutQuery.split("/").pop();
          }

          if (!imagekitFileId && file.path) {
            imagekitFileId = file.path.split("/").pop();
          }

          if (imagekitFileId) {
            try {

              const searchResults = await imagekit.listFiles({
                name: imagekitFileId,
                limit: 1,
              });

              if (searchResults && searchResults.length > 0) {
                const firstResult = searchResults[0];
                // Verificar si es un FileObject antes de acceder a fileId
                if (isFileObject(firstResult)) {
                  await imagekit.deleteFile(firstResult.fileId);
                } else {
                  console.warn(`Result is not a file object:`, firstResult);
                }
              } else {
                await imagekit.deleteFile(imagekitFileId);
              }

              
            } catch (searchError) {
              console.error(
                `Error searching for file in ImageKit:`,
                searchError
              );
              await imagekit.deleteFile(imagekitFileId);
            }
          }
        } catch (error) {
          console.error(`Error deleting file ${file.id} from ImageKit:`, error);
        }
      });

    await Promise.allSettled(deletePromises);

    const deletedFiles = await db
      .delete(files)
      .where(and(eq(files.userId, userId), eq(files.isTrash, true)))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedFiles.length} files from trash`,
    });
  } catch (error) {
    console.error("Error emptying trash:", error);
    return NextResponse.json(
      { error: "Failed to empty trash" },
      { status: 500 }
    );
  }
}