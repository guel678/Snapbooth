package com.derit.snapbooth.editor

data class PhotoStripState(
    val photoUris: List<String> = emptyList(),
    val frameCount: Int = 4,
    val filter: PhotoFilter = PhotoFilter.None,
    val caption: String = "",
) {
    val photoCount: Int
        get() = photoUris.size

    fun addPhoto(uri: String): PhotoStripState {
        if (photoCount >= frameCount) {
            return this
        }

        return copy(photoUris = photoUris + uri)
    }

    fun clearPhotos(): PhotoStripState = copy(photoUris = emptyList())
}
