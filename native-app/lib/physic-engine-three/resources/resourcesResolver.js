import { cacheDirectory, getInfoAsync, copyAsync } from "expo-file-system";
import { Asset } from "expo-asset";
import { loadAsync } from "expo-three";
import { textureMap } from "./textures/textureMap";
import { Platform } from "react-native";
import constants from "expo-constants";

const copyAssetToCacheAsync = async (assetModule, localFilename) => {
  const localUri = `${cacheDirectory}asset_${localFilename}`;
  const fileInfo = await getInfoAsync(localUri, { size: false });
  if (!fileInfo.exists) {
    const asset = Asset.fromModule(assetModule);
    await asset.downloadAsync();
    await copyAsync({
      from: asset.localUri,
      to: localUri,
    });
  }
  return localUri;
};

export const getTexture = async (filename) => {
  let uri = textureMap[filename];
  if (Platform.OS === "android" && constants.appOwnership !== "expo") {
    uri = await copyAssetToCacheAsync(uri, filename);
  }
  return await loadAsync(uri);
};
