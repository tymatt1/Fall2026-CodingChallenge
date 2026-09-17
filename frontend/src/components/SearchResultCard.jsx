// Display one result returned by the Pixabay search API
function SearchResultCard({ image, onSave }) {
  return (
    <article className="search-result">
      <img src={image.previewUrl} alt={image.title} />

      <small>
        Photo by {image.creator} on{" "}
        <a href={image.sourceUrl} target="_blank" rel="noreferrer">
          Pixabay
        </a>
      </small>

      <button type="button" onClick={() => onSave(image)}>
        Save to collection
      </button>
    </article>
  );
}

export default SearchResultCard;
