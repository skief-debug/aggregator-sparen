import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const GITHUB_OWNER = 'skief-debug';
const GITHUB_REPO = 'aggregator-sparen';

function isNewerVersion(latest: string, current: string): boolean {
  const p1 = latest.split('.').map((x) => parseInt(x, 10) || 0);
  const p2 = current.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const v1 = p1[i] ?? 0;
    const v2 = p2[i] ?? 0;
    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }
  return false;
}

export default function GithubUpdater() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [latestReleaseInfo, setLatestReleaseInfo] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );

      if (!response.ok) return;

      const release = await response.json();
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const latestVersion = (release.tag_name || '').replace(/^v/, '');

      if (isNewerVersion(latestVersion, currentVersion)) {
        setLatestReleaseInfo(release);
        setIsUpdateAvailable(true);
      }
    } catch (error) {
      console.log('Update-Prüfung fehlgeschlagen:', error);
    }
  };

  const getApkAsset = () => {
    if (!latestReleaseInfo?.assets) return null;
    return latestReleaseInfo.assets.find((asset: any) =>
      asset.name?.toLowerCase().endsWith('.apk')
    );
  };

  const handleOpenInBrowser = () => {
    const apkAsset = getApkAsset();
    const downloadUrl =
      apkAsset?.browser_download_url ||
      `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    Linking.openURL(downloadUrl).catch((err) =>
      Alert.alert('Fehler', 'Browser konnte nicht geöffnet werden: ' + err.message)
    );
  };

  const handleDownloadAndInstall = async () => {
    const apkAsset = getApkAsset();
    if (!apkAsset) {
      handleOpenInBrowser();
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    const downloadUrl = apkAsset.browser_download_url;
    const fileName = apkAsset.name || 'spargator.apk';
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const fileUri = `${targetDir}${fileName}`;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (progress) => {
          if (progress.totalBytesExpectedToWrite > 0) {
            setDownloadProgress(
              progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            );
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      setIsDownloading(false);

      if (result?.uri) {
        await installApk(result.uri, downloadUrl);
      } else {
        offerBrowserFallback(downloadUrl, 'Download konnte nicht abgeschlossen werden.');
      }
    } catch (error: any) {
      setIsDownloading(false);
      offerBrowserFallback(downloadUrl, error?.message || 'Fehler beim Herunterladen.');
    }
  };

  const offerBrowserFallback = (downloadUrl: string, errorMsg: string) => {
    Alert.alert(
      'Download-Problem',
      `${errorMsg}\n\nMöchtest du das Update direkt über deinen Browser herunterladen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Im Browser laden', onPress: () => Linking.openURL(downloadUrl) },
      ]
    );
  };

  const installApk = async (fileUri: string, fallbackUrl: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
        type: 'application/vnd.android.package-archive',
      });
    } catch (error: any) {
      offerBrowserFallback(
        fallbackUrl,
        'Die APK konnte nicht automatisch gestartet werden.'
      );
    }
  };

  if (!isUpdateAvailable) return null;

  const currentVersion = Constants.expoConfig?.version || '1.0.0';
  const newVersion = latestReleaseInfo?.tag_name || 'neue Version';

  return (
    <Modal visible={isUpdateAvailable} transparent animationType="fade">
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Update verfügbar! 🚀</Text>
          <Text style={styles.message}>
            Eine neue Version ({newVersion}) ist verfügbar. Aktuell installiert: v
            {currentVersion}.
          </Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text style={styles.progressText}>
                {Math.round(downloadProgress * 100)}% geladen
              </Text>
            </View>
          ) : (
            <View style={styles.buttonColumn}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleDownloadAndInstall}
              >
                <Text style={styles.primaryButtonText}>Direkt installieren</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleOpenInBrowser}
              >
                <Text style={styles.secondaryButtonText}>Im Browser laden</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsUpdateAvailable(false)}
              >
                <Text style={styles.cancelButtonText}>Später</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  progressContainer: {
    alignItems: 'center',
    padding: 16,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  buttonColumn: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
});
