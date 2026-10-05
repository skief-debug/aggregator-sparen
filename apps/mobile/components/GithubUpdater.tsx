import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// TODO: Ersetze dies durch deinen GitHub Benutzernamen und den Repo-Namen!
const GITHUB_OWNER = 'skief-debug'; // <-- Authentifizierter GitHub User
const GITHUB_REPO = 'aggregator-sparen';

export default function GithubUpdater() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [latestReleaseInfo, setLatestReleaseInfo] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android' && Device.isDevice) {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        // Repo vielleicht noch privat oder nicht erreichbar
        return;
      }

      const release = await response.json();
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const latestVersion = release.tag_name.replace('v', ''); // v1.0.1 -> 1.0.1

      // Einfacher Versionsvergleich
      if (latestVersion !== currentVersion) {
        setLatestReleaseInfo(release);
        setIsUpdateAvailable(true);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen auf Updates:', error);
    }
  };

  const handleDownloadAndInstall = async () => {
    if (!latestReleaseInfo) return;

    // Suche nach der APK in den Assets des Releases
    const apkAsset = latestReleaseInfo.assets.find((asset: any) => asset.name.endsWith('.apk'));

    if (!apkAsset) {
      Alert.alert('Fehler', 'Keine APK-Datei im neuesten Release gefunden.');
      return;
    }

    setIsDownloading(true);

    const downloadUrl = apkAsset.browser_download_url;
    const fileUri = FileSystem.documentDirectory + apkAsset.name;

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();

      if (result) {
        setIsDownloading(false);
        installApk(result.uri);
      }
    } catch (error) {
      setIsDownloading(false);
      Alert.alert('Download-Fehler', 'Das Update konnte nicht heruntergeladen werden.');
      console.error(error);
    }
  };

  const installApk = async (fileUri: string) => {
    try {
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
        type: 'application/vnd.android.package-archive',
      });
    } catch (error) {
      Alert.alert('Installations-Fehler', 'Die APK konnte nicht automatisch gestartet werden.');
      console.error(error);
    }
  };

  if (!isUpdateAvailable) return null;

  return (
    <Modal visible={isUpdateAvailable} transparent={true} animationType="fade">
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Update verfügbar!</Text>
          <Text style={styles.message}>
            Eine neue Version ({latestReleaseInfo?.tag_name}) ist verfügbar. Möchtest du sie jetzt installieren?
          </Text>

          {isDownloading ? (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}% geladen</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsUpdateAvailable(false)}>
                <Text style={styles.cancelButtonText}>Später</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadAndInstall}>
                <Text style={styles.downloadButtonText}>Update laden</Text>
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
